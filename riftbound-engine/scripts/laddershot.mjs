// Prints da escada contra a IA: botão na tela inicial, escolha do deck, tela da escada, partida de um degrau, fim de
// partida (vitória e derrota com as vidas), aviso de vidas e a vitória da escada com o hall.
// node scripts/laddershot.mjs <pasta> [prefixo]   (SIZES=1920x1080,1366x768,390x844; usa dist/riftbound-mesa.html)
// O fim de partida é forçado (vencedor posto à mão na mesa aberta) só para o print: o fluxo de verdade está em
// tests/escada.test.ts.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { executablePath } from './browser.mjs';
const OUT = process.argv[2] || '/tmp/laddershot';
const PRE = process.argv[3] || '';
fs.mkdirSync(OUT, { recursive: true });
const sizes = (process.env.SIZES || '1920x1080,1366x768,390x844').split(',').map((s) => s.split('x').map(Number));
const browser = await chromium.launch({ executablePath });
const errors = [];
const wait = (p, ms = 400) => p.waitForTimeout(ms);
const tap = (p, sel) => p.$eval(sel, (el) => el.click());
async function shot(page, tag, name, full = false) {
  await page.mouse.move(2, 2);
  await wait(page, 150);
  await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, fullPage: full });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (sw > 0) errors.push(`${tag}: rolagem horizontal de ${sw}px em ${name}`);
}
/** Termina a partida aberta com o vencedor dado (só para o print) e redesenha. */
async function forceEnd(page, w) {
  await page.evaluate((w) => {
    const e = window.__rb.game.engine;
    e.winner = w;
    e.winReason = w === 0 ? 'chegou a 8 pontos' : 'o adversário chegou a 8 pontos';
    e.pl[w].points = 8;
  }, w);
  // qualquer redesenho serve: abre e fecha o registro
  await tap(page, '[data-act=sidetoggle]').catch(() => {});
  await wait(page, 150);
  await tap(page, '[data-act=sidetoggle]').catch(() => {});
  await wait(page, 500);
}
for (const [w, h] of sizes) {
  const tag = `${PRE}${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(tag + ': ' + m.text()));
  page.on('pageerror', (e) => errors.push(tag + ' pageerror: ' + e.message));
  await page.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
  await wait(page, 700);
  await shot(page, tag, 'escada-0-inicio');
  await tap(page, '[data-act=ladder]');
  await wait(page, 900);
  await shot(page, tag, 'escada-1-escolha', true);
  await tap(page, '[data-act=ladpick][data-deck="pre:0"]');
  await wait(page, 1200);
  await shot(page, tag, 'escada-2-degrau1');
  await shot(page, tag, 'escada-2b-degrau1-inteira', true);
  await tap(page, '[data-act=ladfight]');
  await wait(page, 2500);
  await shot(page, tag, 'escada-3-partida');
  const names = await page.evaluate(() => window.__rb.game.engine.pl.map((p) => p.name).join(' × ') + ' · IA ' + window.__rb.game.cfg.aiLevel + ' · ♪ ' + window.__rb.game.cfg.music);
  console.log(tag, 'partida 1:', names);
  await forceEnd(page, 0);
  await shot(page, tag, 'escada-4-fim-vitoria');
  await tap(page, '[data-act=ladnext]');
  await wait(page, 2500);
  const names2 = await page.evaluate(() => window.__rb.game.engine.pl.map((p) => p.name).join(' × ') + ' · IA ' + window.__rb.game.cfg.aiLevel + ' · ♪ ' + window.__rb.game.cfg.music);
  console.log(tag, 'partida 2:', names2);
  await forceEnd(page, 1);
  await shot(page, tag, 'escada-5-fim-derrota');
  await tap(page, '.tt-overlay [data-act=ladder]');
  await wait(page, 900);
  await shot(page, tag, 'escada-6-vidas');
  // escada vencida (progresso posto direto na conta) e o hall
  await page.evaluate(() => {
    const k = 'riftbound-mesa-conta-v1';
    const s = JSON.parse(localStorage.getItem(k));
    const p = s.profiles[s.active];
    p.ladder.rung = 5;
    p.ladder.done = Date.now();
    p.ladder.last = { rung: 4, won: true };
    p.ladderHall = [
      { deckName: p.ladder.deckName, legend: p.ladder.legend, champion: p.ladder.champion, at: Date.now(), losses: p.ladder.losses },
      { deckName: 'Lee Sin (Champion Deck Origins)', legend: 'OGN-257', champion: 'OGN-151', at: Date.now() - 864e5 * 3, losses: 0 },
    ];
    localStorage.setItem(k, JSON.stringify(s));
  });
  await page.reload();
  await wait(page, 700);
  await tap(page, '[data-act=ladder]');
  await wait(page, 1000);
  await shot(page, tag, 'escada-7-vitoria', true);
  await ctx.close();
}
await browser.close();
if (errors.length) {
  console.log('ERROS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('ok', OUT);
