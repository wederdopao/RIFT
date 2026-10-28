// Prints e teste do modo Desafios pela interface: tela inicial → Desafios → lista; abre o 1º desafio, joga a solução
// pela lista de opções (vitória), abre o 2º, erra (derrota), "tentar de novo", desfazer e a lista com o progresso.
// Uso: node scripts/challengeshot.mjs <pasta>   (SIZES=1920x1080,1366x768,390x844)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { executablePath } from './browser.mjs';
const OUT = process.argv[2] || '/tmp/challengeshot';
fs.mkdirSync(OUT, { recursive: true });
const SIZES = (process.env.SIZES || '1920x1080,1366x768,390x844').split(',').map((s) => s.split('x').map(Number));
const browser = await chromium.launch({ executablePath });
const errors = [];
const fail = (m) => errors.push(m);
for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fail(tag + ': ' + e.message));
  page.on('console', (m) => m.type() === 'error' && fail(tag + ' console: ' + m.text()));
  const wait = (ms = 300) => page.waitForTimeout(ms);
  const tap = (sel) => page.$eval(sel, (el) => el.click());
  async function shot(name) {
    await page.mouse.move(2, 2);
    await wait(150);
    await page.screenshot({ path: `${OUT}/${tag}-${name}.png` });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (sw > 0) fail(`${tag}: rolagem horizontal de ${sw}px em ${name}`);
  }
  /** Responde a decisão atual pela opção cujo texto casa (lista "Opções" ou sobreposição). */
  async function choose(re) {
    for (let i = 0; i < 30; i++) {
      if (await page.$('.decision.thinking')) { await wait(250); continue; }
      const lt = await page.$('[data-act=optlist]:not(.on)');
      if (lt && !(await page.$('.tt-overlay [data-opt]'))) { await lt.click(); await wait(80); }
      const opts = await page.$$eval('.tt-optlist [data-opt], .tt-overlay [data-opt]', (els) => els.map((e) => ({ id: e.dataset.opt, t: e.textContent.trim() })));
      const o = opts.find((x) => re.test(x.t));
      if (o) {
        await page.$eval(`.tt-optlist [data-opt="${o.id}"], .tt-overlay [data-opt="${o.id}"]`, (el) => el.click());
        await wait(120);
        return true;
      }
      await wait(150);
    }
    fail(`${tag}: opção ${re} não apareceu`);
    return false;
  }
  await page.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await wait(600);
  await shot('1-inicio');
  await tap('[data-act=challenges]');
  await wait(500);
  await shot('2-lista');
  await tap('[data-act=chhint][data-id=escudo-assalto]');
  await wait(200);
  await shot('3-lista-dica');
  if (await page.$('[data-act=chplay][data-id=equipar]')) fail(`${tag}: o 2º desafio deveria estar bloqueado`);
  // 1º desafio: abertura, mesa com o objetivo, solução (Cleave e atacar)
  await tap('[data-act=chplay][data-id=escudo-assalto]');
  await wait(500);
  await shot('4-abertura');
  await tap('[data-act=chgo]');
  await wait(300);
  await shot('5-mesa');
  await choose(/Jogar Cleave/);
  await choose(/Vanguard Sergeant/);
  for (let i = 0; i < 4 && (await page.$('.tt-optlist [data-opt=pass], .tt-dock [data-opt=pass]')); i++) await choose(/^Passar/);
  await choose(/Mover unidades/);
  await choose(/Grove/);
  for (let i = 0; i < 8 && !(await page.$('.chres')); i++) await choose(/^Passar|Confirmar|Distribuir|Vanguard|Sunlit/);
  await wait(400);
  if (!(await page.$('.chres.win'))) fail(`${tag}: a solução do 1º desafio não deu vitória`);
  await shot('6-vitoria');
  // próximo (2º): erra de propósito (ataca sem equipar) e encerra o turno
  await tap('.chres [data-act=chplay]');
  await wait(400);
  await tap('[data-act=chgo]');
  await wait(200);
  await choose(/Mover unidades/);
  await choose(/Grove/);
  for (let i = 0; i < 12 && !(await page.$('.chres')); i++) {
    await choose(/Encerrar o turno|^Passar|Daring|Stalwart/);
  }
  await wait(600);
  if (!(await page.$('.chres.lose'))) fail(`${tag}: a jogada errada do 2º desafio não deu derrota`);
  await shot('7-derrota');
  // desfazer volta para antes de encerrar o turno; "tentar de novo" recomeça
  await tap('.chres [data-act=undo]');
  await wait(400);
  if (await page.$('.chres')) fail(`${tag}: desfazer não tirou o resultado`);
  await tap('.chhud [data-act=chhint]');
  await wait(200);
  await shot('8-mesa-dica');
  await tap('.chhud [data-act=chretry]');
  await wait(300);
  const pts = await page.evaluate(() => window.__rb.game.engine.pl[0].points);
  if (pts !== 2) fail(`${tag}: recomeçar não voltou à mesa montada (pontos ${pts})`);
  // Menu → lista com o progresso
  await page.$eval('[data-act=setup]', (el) => el.click());
  await wait(400);
  if (!(await page.$('.setup.challenges'))) fail(`${tag}: o Menu do desafio não voltou para a lista`);
  await shot('9-lista-progresso');
  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('riftbound-mesa-conta-v1')).profiles);
  const p = Object.values(prog)[0].challenges;
  if (!p?.['escudo-assalto']?.solved || p['equipar']?.tries !== 2) fail(`${tag}: progresso salvo errado: ${JSON.stringify(p)}`);
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'sem erros');
