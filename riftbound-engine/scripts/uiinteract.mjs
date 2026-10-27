// Joga partidas usando a mesa como uma pessoa: clica numa unidade pronta e no destino para mover, arrasta cartas da mão
// para a base/campos (e spells para cima de cartas), e usa a barra de decisão para o resto. Tira prints quando aparece
// a pilha com alvo, a previsão de combate e a seleção de movimento. Uso: node scripts/uiinteract.mjs <pasta> [passos]
import { chromium } from 'playwright-core';
import { executablePath } from './browser.mjs';
const OUT = process.argv[2] || '.';
const MAX = Number(process.argv[3] || 1500);
const W = Number(process.env.W || 1600);
const H = Number(process.env.H || 900);
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: W, height: H }, hasTouch: !!process.env.TOUCH });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
await page.click(`[data-act=mode][data-mode=${process.env.OPP || 'human'}]`);
await page.waitForTimeout(100);
await page.waitForTimeout(150);
await page.evaluate(() => {
  const el = document.getElementById('privacy0');
  if (el && el.checked) {
    el.checked = false;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
});
await page.waitForTimeout(100);
await page.click('button[type=submit]');
await page.waitForSelector('.tt-mat');
let seed = Number(process.env.SEED || 99);
const rnd = (n) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed % n);
const shots = new Set();
const shot = async (name) => {
  if (shots.has(name)) return;
  shots.add(name);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
const nAns = () => page.evaluate(() => window.__rb.game.answers.length);
const stats = { move: 0, moveOk: 0, drag: 0, dragOk: 0, list: 0, arrows: 0, preview: 0, arm: 0, armOk: 0, armCancel: 0, armTarget: 0, trig: 0 };

async function dragTo(from, to) {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  if (!a || !b) return false;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 - 12, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.waitForTimeout(60);
  if (!shots.has('arrastando')) await shot('arrastando');
  await page.mouse.up();
  await page.waitForTimeout(80);
  return true;
}

let steps = 0;
async function step() {
  if (await page.$('.decision.over')) return 'stop';
  if (await page.$('.decision.thinking')) {
    await page.waitForTimeout(120);
    return;
  }
  const h = (await page.$('.tt-overlay [data-act=handoff]')) || (await page.$('[data-act=handoff]'));
  if (h) {
    await h.click();
    return;
  }
  // prints do que é novo
  const st = await page.evaluate(() => {
    const e = window.__rb.game.engine;
    return { targets: e.chain.some((it) => (it.targetIds || []).some((g) => g.length)), combat: !!document.querySelector('.tt-cpv.live') };
  });
  if (st.targets) {
    const n = await page.$$eval('.tt-arrow', (els) => els.length);
    if (n) {
      stats.arrows++;
      await shot('pilha-setas');
    } else errors.push('pilha com alvo e sem seta: ' + (await page.evaluate(() => JSON.stringify(window.__rb.game.engine.chain.map((it) => (it.targetIds || []).flat().map((id) => window.__rb.game.engine.objs[id]?.zone))))));
  }
  if (st.combat) {
    stats.preview++;
    await shot('combate-previsao');
  }
  const before = await nAns();
  // sobreposição (mulligan, campo, cartas fora da mesa): escolhe lá
  if (await page.$('.tt-overlay [data-opt]')) {
    const opts = await page.$$eval('.tt-overlay [data-opt]', (els) => els.map((e) => e.dataset.opt));
    const conf = await page.$('.tt-overlay [data-act=confirm]');
    if (conf) {
      if (rnd(2)) await page.click(`.tt-overlay [data-opt="${opts[rnd(opts.length)]}"]`);
      const ok = await page.$('.tt-overlay [data-act=confirm]:not([disabled])');
      if (ok) await ok.click();
      else await page.click(`.tt-overlay [data-opt="${opts[0]}"]`);
    } else await page.click(`.tt-overlay [data-opt="${opts[rnd(opts.length)]}"]`);
    return;
  }
  // ordem de efeitos simultâneos: lista ordenável (às vezes troca a ordem) e Confirmar ordem
  if (await page.$('[data-act=trigok]')) {
    stats.trig++;
    const ups = await page.$$('.tt-trig [data-act=trigup]:not([disabled])');
    if (ups.length && rnd(2)) await ups[rnd(ups.length)].click();
    await shot('ordem-efeitos');
    await page.click('[data-act=trigok]');
    return;
  }
  const root = await page.$('.tt-dock:not(.ask) .tt-endbtn');
  const r = rnd(10);
  // 0) confirmar antes de jogar: o primeiro clique numa carta acesa só a escolhe (painel, nada respondido); depois
  //    confirma (botão, clique de novo na carta ou num alvo aceso) ou cancela (Esc)
  // só cartas com o centro à mostra (no celular o leque da mão fica parcialmente sob as pilhas)
  const handLit = [];
  for (const el of await page.$$('.tt-handrow.bottom .card.actionable')) {
    const free = await el.evaluate((n) => { const r = n.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && n.contains(e); }).catch(() => false);
    if (free) handLit.push(el);
  }
  if (root && handLit.length && rnd(10) < 3) {
    stats.arm++;
    await page.waitForTimeout(380); // um clique logo depois de soltar uma carta arrastada é ignorado de propósito
    const pickEl = handLit[rnd(handLit.length)];
    const pb = await pickEl.boundingBox();
    const under = process.env.DBG && pb ? await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); const c = e && e.closest('[data-obj]'); return (c ? c.className + ' ' + c.dataset.obj : 'nada') + ' | ' + (e ? e.className : ''); }, [pb.x + pb.width / 2, pb.y + pb.height / 2]) : '';
    await pickEl.click({ timeout: 2000 }).catch((e) => process.env.DBG && console.log('CLICKERR', String(e).slice(0, 200)));
    await page.waitForTimeout(60);
    if (process.env.DBG && !(await page.$('.tt-arm'))) console.log('NOARM', under, await pickEl.evaluate((n) => n.className + ' ' + n.dataset.obj).catch(() => 'detached'));
    if (!(await page.$('.tt-arm'))) {
      // o leque da mão sobrepõe as cartas: o clique pode ter caído na vizinha (sem ação)
      const hitOk = await page.evaluate(() => !!document.querySelector('.tt-handrow.bottom .card.armed, .tt-ctx, .modal.zoom'));
      if (!hitOk && !(await page.$('.tt-hint'))) errors.push('clique numa carta acesa não abriu o painel de confirmar: ' + (await page.$eval('.tt-dock', (e) => e.textContent).catch(() => '')).replace(/\s+/g, ' ').slice(0, 140));
      await page.keyboard.press('Escape');
      return;
    }
    if ((await nAns()) !== before) errors.push('o primeiro clique numa carta jogou direto');
    await shot('confirmar-jogar');
    const lit = await page.$$('.tt-mat .card.armtgt, .tt-bf.armdest, .tt-base.armdest');
    if (lit.length && !shots.has('confirmar-alvos')) await shot('confirmar-alvos');
    const how = Math.floor(rnd(1000) / 250);
    if (how === 0) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(40);
      if (await page.$('.tt-arm')) errors.push('Esc não cancelou o painel');
      else if ((await nAns()) === before) stats.armCancel++;
      return;
    }
    if (how === 1 && lit.length) {
      const el = lit[rnd(lit.length)];
      const box = await el.boundingBox();
      // só clica se o alvo estiver à mostra naquele ponto (o painel pode cobrir parte da mesa)
      const free = box && (await el.evaluate((n, [x, y]) => n.contains(document.elementFromPoint(x, y)), [box.x + box.width / 2, box.y + box.height / 2]));
      if (free) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        stats.armTarget++;
      } else await page.click('.tt-arm [data-act=armgo]').catch(() => page.keyboard.press('Escape'));
    } else if (how === 2) {
      // clicar de novo na carta (no celular o painel fica por cima da mão: aí confirma pelo botão)
      const armedCard = await page.$('.tt-handrow.bottom .card.armed');
      const cb = armedCard && (await armedCard.boundingBox());
      const free = cb && (await armedCard.evaluate((n, [x, y]) => n.contains(document.elementFromPoint(x, y)), [cb.x + cb.width / 2, cb.y + cb.height / 2]));
      if (free) await page.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2);
      else await page.click('.tt-arm [data-act=armgo]').catch(() => {});
    } else {
      const go = await page.$('.tt-arm [data-act=armgo]');
      if (go) await go.click();
      else {
        const b = await page.$$('.tt-arm [data-act=arm]');
        if (b.length) await b[rnd(b.length)].click();
        await page.keyboard.press('Enter');
      }
    }
    await page.waitForTimeout(60);
    if ((await nAns()) > before) stats.armOk++;
    else if (!(await page.$('.tt-dock .err'))) errors.push('confirmar não jogou: ' + (await page.$eval('.tt-dock', (e) => e.textContent).catch(() => '')).replace(/\s+/g, ' ').slice(0, 120));
    return;
  }
  // 1) mover clicando: unidade pronta → destino aceso
  const movable = await page.$$('.tt-mat .card.movable');
  if (root && movable.length && r < 4) {
    stats.move++;
    const u = movable[rnd(movable.length)];
    await u.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(40);
    if (await page.$('.tt-ctx')) await page.click('.tt-ctx [data-act=movesel]');
    const dests = await page.$$('[data-dest]');
    if (dests.length) {
      await shot('mover-destinos');
      if ((await page.$('.tt-cpv:not(.live)')) && !shots.has('mover-previsao')) await shot('mover-previsao');
      const d = dests[rnd(dests.length)];
      const box = await d.boundingBox();
      // clica num canto vazio do destino (não em cima de outra unidade)
      await page.mouse.click(box.x + 8, box.y + box.height - 8);
      await page.waitForTimeout(60);
      const after = await nAns();
      if (after > before) stats.moveOk++;
      else if (process.env.DBG) console.log('MOVEFAIL', JSON.stringify(box), await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.className + ' / ' + (e.closest('[data-dest]')?.dataset.dest || '-') : 'null'; }, [box.x + 8, box.y + box.height - 8]), (await page.$eval('.tt-dock', (e) => e.textContent).catch(() => '')).replace(/\s+/g, ' ').slice(0, 140));
      else if (await page.$('.tt-dock .err')) {} else errors.push('mover não andou: ' + (await page.$eval('.tt-dock', (e) => e.textContent).catch(() => '')).slice(0, 120));
    }
    await page.keyboard.press('Escape');
    return;
  }
  // 2) arrastar da mão: unidade/gear para a base ou um campo; spell para cima de uma carta da mesa
  const hand = await page.$$('.tt-handrow.bottom .card.dragok');
  if (root && hand.length && r < 8) {
    stats.drag++;
    const c = hand[rnd(hand.length)];
    const zones = await page.$$('.tt-home.bottom .tt-base, .tt-bf, .tt-lane .card');
    await dragTo(c, zones[rnd(zones.length)]);
    const after = await nAns();
    if (after > before) stats.dragOk++;
    else if (process.env.DBG) console.log('DRAGFAIL', (await page.$eval('.tt-dock', (e) => e.textContent).catch(() => '')).replace(/\s+/g, ' ').slice(0, 160), await page.evaluate(() => [!!document.querySelector('.tt-arm'), !!document.querySelector('.modal'), !!document.querySelector('.tt-ctx')].join(',')));
    return;
  }
  // 3) cartas acesas na mesa (alvos, locais) ou a barra de decisão
  const lit = await page.$$('.tt-mat .card.actionable:not(.movable), .tt-bf.actionable, .tt-base.actionable');
  const multi = await page.$('.tt-dock [data-act=confirm]');
  if (lit.length && !multi && !root && rnd(3)) {
    await lit[rnd(lit.length)].click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(40);
    if (await page.$('.tt-ctx button')) {
      const b = await page.$$('.tt-ctx button');
      await b[rnd(b.length)].click({ timeout: 2000 }).catch(() => {});
    }
    return;
  }
  const lt = await page.$('[data-act=optlist]:not(.on)');
  if (lt) {
    await lt.click();
    return;
  }
  stats.list++;
  const opts = await page.$$eval('.tt-optlist [data-opt]', (els) => els.map((e) => e.dataset.opt));
  if (multi) {
    for (const o of opts) {
      if ((await page.$('[data-act=confirm]:not([disabled])')) && rnd(2)) break;
      await page.click(`.tt-optlist [data-opt="${o}"]`);
    }
    const ok = await page.$('[data-act=confirm]:not([disabled])');
    if (ok) await ok.click();
    else {
      errors.push('confirmar travado');
      return 'stop';
    }
    return;
  }
  if (!opts.length) {
    errors.push('sem opções');
    return 'stop';
  }
  const non = opts.filter((o) => o !== 'end' && o !== 'pass');
  const pick = non.length && rnd(10) < 6 ? non[rnd(non.length)] : opts.includes('end') ? 'end' : opts.includes('pass') ? 'pass' : opts[0];
  await page.click(`.tt-optlist [data-opt="${pick}"]`, { timeout: 3000 }).catch(() => {});
}
for (; steps < MAX; steps++) {
  let r;
  try {
    r = await step();
  } catch (e) {
    // a tela redesenhou no meio de um clique: tenta de novo no próximo passo
    if (!/not attached|detached|Target closed|intercepts/i.test(String(e))) throw e;
    continue;
  }
  if (r === 'stop') break;
}
await shot('fim');
const over = await page.$eval('.decision', (d) => d.textContent).catch(() => '');
console.log('passos', steps, '|', over.replace(/\s+/g, ' ').slice(0, 100));
console.log(JSON.stringify(stats));
console.log(errors.length ? 'ERROS:\n' + [...new Set(errors)].join('\n') : 'sem erros');
await browser.close();
