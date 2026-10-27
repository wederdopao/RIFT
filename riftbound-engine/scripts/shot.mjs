// Abre a página, joga alguns passos pela interface e tira prints.
import { chromium } from 'playwright-core';
import { executablePath } from './browser.mjs';
const OUT = process.argv[2] || '.';
const browser = await chromium.launch({ executablePath });
const errors = [];
async function run(width, height, tag) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('console', (m) => m.type() === 'error' && errors.push(tag + ': ' + m.text()));
  page.on('pageerror', (e) => errors.push(tag + ' pageerror: ' + e.message));
  await page.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${tag}-setup.png`, fullPage: true });
  await page.click('button[type=submit]');
  await page.waitForTimeout(200);
  // mulligans: confirmar sem trocar
  for (let i = 0; i < 4; i++) {
    const handoff = await page.$('[data-act=handoff]');
    if (handoff) { await handoff.click(); continue; }
    const conf = await page.$('[data-act=confirm]');
    if (conf) await conf.click();
  }
  // joga alguns passos: escolhe a primeira opção "Jogar" disponível, senão encerra o turno
  for (let step = 0; step < 40; step++) {
    const handoff = await page.$('[data-act=handoff]');
    if (handoff) { await handoff.click(); continue; }
    const opts = await page.$$eval('[data-opt]', (els) => els.map((e) => [e.dataset.opt, e.textContent]));
    if (!opts.length) break;
    const conf = await page.$('[data-act=confirm]');
    const play = opts.find(([id]) => id.startsWith('play:')) || opts.find(([id]) => id === 'move');
    if (conf) {
      await page.click(`[data-opt="${opts[0][0]}"]`);
      if (await page.$('[data-act=confirm]:not([disabled])')) await page.click('[data-act=confirm]');
      continue;
    }
    if (play && step % 3 !== 2) await page.click(`[data-opt="${play[0]}"]`);
    else if (opts.find(([id]) => id === 'end')) await page.click('[data-opt="end"]');
    else await page.click(`[data-opt="${opts[0][0]}"]`);
  }
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${tag}-game.png`, fullPage: false });
  await page.close();
}
await run(1440, 1000, 'desk');
await run(400, 860, 'phone');
await browser.close();
console.log(errors.length ? errors.join('\n') : 'sem erros no console');
