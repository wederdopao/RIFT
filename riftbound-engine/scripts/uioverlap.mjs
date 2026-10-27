// Mede, em várias telas, se a barra de decisão cobre alguma carta dos campos/bases e se o pedido sai cortado. Uso: node scripts/uioverlap.mjs [pasta para print]
import { chromium } from 'playwright-core';
import { executablePath } from './browser.mjs';
const b = await chromium.launch({ executablePath });
const out = [];
for (const [w, h] of [[1920, 1080], [1600, 900], [1366, 768], [1280, 720], [390, 844], [844, 390]]) {
  let shot = false;
  const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: w < 700 });
  await p.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
  await p.click('[data-act=mode][data-mode=human]');
  await p.waitForTimeout(150);
  await p.evaluate(() => { const el = document.getElementById('privacy0'); if (el && el.checked) { el.checked = false; el.dispatchEvent(new Event('change', { bubbles: true })); } });
  await p.click('button[type=submit]');
  await p.waitForSelector('.tt-mat');
  let worst = 0, cut = 0;
  let seed = 3; const rnd = (n) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed % n);
  for (let i = 0; i < 260; i++) {
    try {
      const r = await p.evaluate(() => {
        const d = document.querySelector('.tt-dock')?.getBoundingClientRect();
        if (!d) return 0;
        let m = 0;
        for (const c of document.querySelectorAll('.tt-lane .card, .tt-base .card')) {
          const r = c.getBoundingClientRect();
          const ov = Math.max(0, Math.min(r.bottom, d.bottom) - Math.max(r.top, d.top)) * Math.max(0, Math.min(r.right, d.right) - Math.max(r.left, d.left));
          m = Math.max(m, ov / (r.width * r.height));
        }
        const dp = document.querySelector('.tt-dprompt');
        const trunc = dp && dp.scrollWidth > dp.clientWidth + 1 ? 1 : 0;
        return m + trunc * 10;
      });
      if (r >= 10) cut++;
      if (r % 10 > 0.2 && !shot && process.argv[2]) { shot = true; await p.screenshot({ path: process.argv[2] + "/ov.png" }); }
      worst = Math.max(worst, r % 10);
      const ov = await p.$('.tt-overlay [data-opt]');
      if (ov) { const c = await p.$('.tt-overlay [data-act=confirm]'); if (c) await c.click(); else await ov.click(); continue; }
      if (await p.$('[data-act=trigok]')) { const ups = await p.$$('.tt-trig [data-act=trigup]:not([disabled])'); if (ups.length && rnd(2)) await ups[rnd(ups.length)].click(); await p.click('[data-act=trigok]'); continue; }
      const lt = await p.$('[data-act=optlist]:not(.on)'); if (lt) { await lt.click(); continue; }
      const opts = await p.$$eval('.tt-optlist [data-opt]', (els) => els.map((e) => e.dataset.opt));
      const conf = await p.$('.tt-dock [data-act=confirm]:not([disabled])');
      if (conf) { await conf.click(); continue; }
      if (await p.$('.tt-dock [data-act=confirm]')) { await p.click(`.tt-optlist [data-opt="${opts[0]}"]`); continue; }
      if (!opts.length) break;
      const non = opts.filter((o) => o !== 'end' && o !== 'pass');
      const pick = non.length && rnd(10) < 7 ? non[rnd(non.length)] : opts.includes('end') ? 'end' : opts.includes('pass') ? 'pass' : opts[0];
      await p.click(`.tt-optlist [data-opt="${pick}"]`, { timeout: 2000 });
      if (await p.$('.decision.over')) break;
    } catch {}
  }
  out.push(`${w}x${h}: maior parte de carta coberta pela barra ${(worst * 100).toFixed(0)}% · decisões com o pedido cortado ${cut}`);
  await p.close();
}
console.log(out.join('\n'));
await b.close();
