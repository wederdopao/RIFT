// Prints da mesa: mulligan, partida em andamento (com prévia) em várias telas. Uso: node scripts/tableshot.mjs <pasta>
import { chromium } from 'playwright-core';
import { executablePath } from './browser.mjs';
const OUT = process.argv[2] || '.';
const SIZES = (process.env.SIZES || '1920x1080,1366x768,390x844,844x390').split(',').map((s) => s.split('x').map(Number));
const STEPS = Number(process.env.STEPS || 26);
const browser = await chromium.launch({ executablePath });
const errors = [];
for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`;
  const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700 });
  page.on('pageerror', (e) => errors.push(tag + ': ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(tag + ' console: ' + m.text()));
  await page.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
  await page.waitForTimeout(300);
  await page.click('button[type=submit]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${tag}-1-inicio.png` });
  let seed = 7;
  const rnd = (n) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed % n);
  for (let step = 0; step < STEPS; step++) {
    if (await page.$('.decision.over')) break;
    if (await page.$('.decision.thinking')) { await page.waitForTimeout(250); step--; continue; }
    if (await page.$('[data-act=trigok]')) { const ups = await page.$$('.tt-trig [data-act=trigup]:not([disabled])'); if (ups.length && rnd(2)) await ups[rnd(ups.length)].click(); await page.click('[data-act=trigok]'); continue; }
    const conf = await page.$('[data-act=confirm]:not([disabled])');
    const lt = await page.$('[data-act=optlist]:not(.on)');
    if (lt && !(await page.$('.tt-overlay [data-opt]'))) { await lt.click(); step--; continue; }
    const opts = await page.$$eval('.tt-optlist [data-opt], .tt-overlay [data-opt]', (els) => els.map((e) => e.dataset.opt));
    if (!opts.length && conf) { await conf.click(); continue; }
    if (!opts.length) break;
    if (conf && !(await page.$('.tt-overlay .tt-pick'))) { await conf.click(); continue; }
    if (await page.$('.tt-overlay [data-act=confirm]')) { await page.click('.tt-overlay [data-act=confirm]'); continue; }
    const play = opts.filter((o) => o.startsWith('play:'));
    const pick = play.length && rnd(3) ? play[rnd(play.length)] : opts.includes('end') && rnd(4) === 0 ? 'end' : opts[rnd(opts.length)];
    await page.click(`.tt-optlist [data-opt="${pick}"], .tt-overlay [data-opt="${pick}"]`, { timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(500);
  const see = await page.$('.tt-overlay.end [data-act=hideoverlay]');
  if (see) { await see.click(); await page.waitForTimeout(200); }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${tag}-2-partida.png` });
  const card = await page.$('.tt-handrow.bottom .card, .tt-lane .card');
  if (card && w >= 700) {
    await card.hover({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${tag}-3-previa.png` });
  }
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'sem erros');
