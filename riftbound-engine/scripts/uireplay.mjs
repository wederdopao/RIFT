// Relatar problema + replay: joga um pouco contra a IA, baixa o relatório, abre no replay pela tela inicial, navega
// lance a lance e continua jogando dali. Uso: node scripts/uireplay.mjs <pasta>
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { executablePath } from './browser.mjs';
const OUT = process.argv[2] || '.';
const browser = await chromium.launch({ executablePath });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 880 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
await page.click('button[type=submit]');
await page.waitForSelector('.tt-mat');
let seed = 5;
const rnd = (n) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed % n);
// joga ~60 decisões pela lista de opções
for (let i = 0; i < 2500 && (await page.evaluate(() => window.__rb.game.answers.length)) < 60; i++) {
  try {
    if (await page.$('.decision.thinking')) {
      await page.waitForTimeout(150);
      continue;
    }
    if (await page.$('.tt-overlay [data-opt]')) {
      const c = await page.$('.tt-overlay [data-act=confirm]');
      if (c) await c.click();
      else await page.click('.tt-overlay [data-opt]');
      continue;
    }
    const lt = await page.$('[data-act=optlist]:not(.on)');
    if (lt) {
      await lt.click();
      continue;
    }
    const conf = await page.$('.tt-dock [data-act=confirm]:not([disabled])');
    if (conf) {
      await conf.click();
      continue;
    }
    const opts = await page.$$eval('.tt-optlist [data-opt]', (els) => els.map((e) => e.dataset.opt));
    if (await page.$('.tt-dock [data-act=confirm]')) {
      // escolha múltipla: marca uma opção ainda não marcada até o Confirmar habilitar
      const off = await page.$('.tt-optlist .opt:not(.on)');
      if (off) await off.click();
      continue;
    }
    const non = opts.filter((o) => o !== 'end' && o !== 'pass');
    const pick = non.length && rnd(10) < 6 ? non[rnd(non.length)] : opts.includes('end') ? 'end' : opts.includes('pass') ? 'pass' : opts[0];
    await page.click(`.tt-optlist [data-opt="${pick}"]`, { timeout: 2000 });
    if (await page.$('.decision.over')) break;
  } catch {}
}
await page.keyboard.press('Escape');
const before = await page.evaluate(() => JSON.stringify(window.__rb.game.answers));
// relatório: baixa o arquivo
await page.click('[data-act=report]');
await page.fill('#rnote', 'teste do relatório');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=rdownload]')]);
const file = OUT + '/relatorio.json';
await dl.saveAs(file);
const json = readFileSync(file, 'utf8');
const rep = JSON.parse(json);
if (JSON.stringify(rep.game.answers) !== before) errors.push('relatório com respostas diferentes da partida');
if (rep.note !== 'teste do relatório') errors.push('nota não foi para o relatório');
await page.click('.modal button[data-act=closemodal]');
// abre pela tela inicial colando o conteúdo
await page.click('[data-act=setup]');
await page.click('[data-act=importopen]');
await page.fill('#rpaste', json);
await page.click('[data-act=rimport]');
await page.waitForSelector('.tt-dock.replay');
const closeNote = await page.$('.modal [data-act=closemodal]');
if (closeNote) await page.click('.modal button[data-act=closemodal]');
const n = rep.game.answers.length;
const pos = () => page.evaluate(() => window.__rb.game.answers.length);
if ((await pos()) !== n) errors.push(`replay abriu no lance ${await pos()} e não no ${n}`);
await page.screenshot({ path: OUT + '/replay-fim.png' });
await page.click('[data-act=rgo][data-to="0"]');
if ((await pos()) !== 0) errors.push('⏮ não voltou ao começo');
for (let k = 0; k < 5; k++) await page.keyboard.press('ArrowRight');
if ((await pos()) !== 5) errors.push(`setas: esperava lance 5, veio ${await pos()}`);
await page.$eval('#rrange', (el, v) => {
  el.value = String(v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, Math.floor(n / 2));
if ((await pos()) !== Math.floor(n / 2)) errors.push('barra de lances não foi para o meio');
await page.screenshot({ path: OUT + '/replay-meio.png' });
const mid = await page.evaluate(() => JSON.stringify(window.__rb.game.answers));
if (mid !== JSON.stringify(rep.game.answers.slice(0, Math.floor(n / 2)))) errors.push('o meio do replay não bate com a partida');
// continua jogando dali, os dois no mesmo aparelho
await page.click('[data-act=rplay][data-mode=human]');
if (await page.$('.tt-dock.replay')) errors.push('não saiu do replay ao continuar');
const opts = await page.$$('.tt-dock [data-opt], .tt-mat .card.actionable');
if (!opts.length && !(await page.$('.tt-overlay'))) errors.push('depois de continuar não há o que fazer');
console.log('lances', n, '| replay ok');
console.log(errors.length ? 'ERROS:\n' + errors.join('\n') : 'sem erros');
await browser.close();
