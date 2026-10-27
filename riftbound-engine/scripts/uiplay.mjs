// Joga uma partida inteira clicando na interface (escolhas aleatórias) para achar travas da UI.
import { chromium } from 'playwright-core';
import { executablePath } from './browser.mjs';
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1440), height: Number(process.env.H || 960) }, hasTouch: !!process.env.TOUCH });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
if (process.env.OPP) { await page.click(`[data-act=mode][data-mode=${process.env.OPP}]`); await page.waitForTimeout(100); }
await page.click('button[type=submit]');
let seed = 12345;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
let steps = 0;
const MAX = Number(process.argv[3] || 4000);
for (; steps < MAX; steps++) {
  if (await page.$('.decision.over')) break;
  if (await page.$('.decision.thinking')) { await page.waitForTimeout(150); continue; }
  const h = await page.$('.tt-overlay [data-act=handoff]');
  if (h) { await h.click(); continue; }
  if (await page.$('[data-act=trigok]')) { const ups = await page.$$('.tt-trig [data-act=trigup]:not([disabled])'); if (ups.length && rnd(2)) await ups[rnd(ups.length)].click(); await page.click('[data-act=trigok]'); continue; }
  // a lista completa das opções fica aberta (as cartas da mesa são testadas em scripts/uiinteract.mjs)
  const lt = await page.$('[data-act=optlist]:not(.on)');
  if (lt && !(await page.$('.tt-overlay [data-opt]'))) { await lt.click(); continue; }
  const scope = (await page.$('.tt-overlay [data-opt]')) ? '.tt-overlay' : '.tt-optlist';
  const opts = await page.$$eval(`${scope} [data-opt]`, (els) => els.map((e) => e.dataset.opt));
  const cs = scope === '.tt-overlay' ? '.tt-overlay' : '.tt-dock';
  const multi = await page.$(`${cs} [data-act=confirm]`);
  if (multi) {
    const range = await page.$eval('.decision', (d) => d.textContent);
    // marca opções até o botão de confirmar habilitar
    for (const o of opts) {
      if (await page.$(`${cs} [data-act=confirm]:not([disabled])`) && rnd(2)) break;
      await page.click(`${scope} [data-opt="${o}"]`);
      if (await page.$(`${cs} [data-act=confirm]:not([disabled])`) && rnd(3) === 0) break;
    }
    const ok = await page.$(`${cs} [data-act=confirm]:not([disabled])`);
    if (ok) await ok.click(); else { errors.push('confirmar travado: ' + range); break; }
    continue;
  }
  if (!opts.length) { errors.push('sem opções e sem fim de jogo'); break; }
  const non = opts.filter((o) => o !== 'end' && o !== 'pass');
  const pick = non.length && rnd(10) < 7 ? non[rnd(non.length)] : opts.includes('end') ? 'end' : opts.includes('pass') ? 'pass' : opts[0];
  await page.click(`${scope} [data-opt="${pick}"]`);
}
const over = await page.$eval('.decision', (d) => d.textContent).catch(() => '');
console.log('passos', steps, '|', over.slice(0, 120));
await page.screenshot({ path: process.argv[2] + '/ui-end' + (process.env.TAG || '') + '.png' });
// fim de partida: a partida entra no histórico da conta, com o replay
if (await page.$('.decision.over, .tt-overlay.end')) {
  await page.waitForTimeout(500);
  const h = await page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('riftbound-mesa-historico-v1:'));
    const o = k ? JSON.parse(localStorage.getItem(k)) : null;
    return o ? o.list.map((e) => `${e.mode} ${e.turns}t ${e.replay ? e.replay.length + 'B' : 'sem replay'}`) : [];
  });
  if (h.length !== 1) errors.push('histórico depois da partida: ' + JSON.stringify(h));
  else console.log('histórico:', h[0]);
}
console.log(errors.length ? 'ERROS:\n' + errors.join('\n') : 'sem erros');
await browser.close();
