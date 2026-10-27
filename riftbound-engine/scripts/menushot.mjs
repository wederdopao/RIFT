// Prints das telas fora da mesa: tela inicial, escolha de deck, Meus decks e o deckbuilder.
// node scripts/menushot.mjs <pasta> [prefixo]   (SIZES=1366x768,1920x1080,390x844)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { executablePath } from './browser.mjs';
import { execSync } from 'node:child_process';
const OUT = process.argv[2] || '/tmp/menushot';
const PRE = process.argv[3] || '';
fs.mkdirSync(OUT, { recursive: true });
// telas novas: conta com partidas de verdade (scripts/histseed.ts grava partidas aleatórias como a interface grava)
const SEED = process.env.HIST_SEED || `${OUT}/histseed.json`;
if (!fs.existsSync(SEED)) execSync(`npx tsx scripts/histseed.ts ${SEED} 6`, { stdio: 'inherit' });

const sizes = (process.env.SIZES || '1366x768,1920x1080,390x844').split(',').map((s) => s.split('x').map(Number));
const browser = await chromium.launch({ executablePath });
const errors = [];
const wait = (p, ms = 350) => p.waitForTimeout(ms);
// clique pelo DOM (o botão pode estar escondido numa aba no celular)
const tap = (p, sel) => p.$eval(sel, (el) => el.click());
// print sem a prévia do mouse; acusa rolagem horizontal
async function shot(page, tag, name) {
  await page.mouse.move(2, 2);
  await wait(page, 120);
  await page.screenshot({ path: `${OUT}/${tag}-${name}.png` });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (sw > 0) errors.push(`${tag}: rolagem horizontal de ${sw}px em ${name}`);
}
for (const [w, h] of sizes) {
  const tag = `${PRE}${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(tag + ': ' + m.text()));
  page.on('pageerror', (e) => errors.push(tag + ' pageerror: ' + e.message));
  await page.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
  await wait(page, 600);
  await shot(page, tag, '1-inicio');
  await page.click('[data-act=mode][data-mode=online]');
  await wait(page);
  await shot(page, tag, '1b-online');
  await page.click('[data-act=mode][data-mode=ai]');
  await wait(page);
  // escolha de deck (tela nova); se não existir, segue
  const pick = await page.$('[data-act=pickdeck]');
  if (pick) {
    await pick.click();
    await wait(page);
    await shot(page, tag, '2-escolha');
    await page.keyboard.press('Escape');
    await wait(page, 150);
  }
  // Meus decks: copia os dois starters (abre o editor) e volta para a lista
  await tap(page, '[data-act=decks]');
  await wait(page);
  for (const i of [0, 1]) {
    await tap(page, `[data-db=starter][data-i="${i}"]`);
    await wait(page);
    if (i === 0) {
      await shot(page, tag, '4-editor');
      const tab = await page.$('[data-db=tab][data-tab=deck]');
      if (tab && (await tab.isVisible())) {
        await tab.click();
        await wait(page);
        await shot(page, tag, '5-editor-deck');
        await tap(page, '[data-db=tab][data-tab=cards]');
        await wait(page, 150);
      }
      // novo deck vazio: mostra a validação
    }
    await tap(page, '[data-db=tolist]');
    await wait(page);
  }
  await tap(page, '[data-db=new]');
  await wait(page);
  await shot(page, tag, '6-novo');
  await tap(page, '[data-db=tolist]');
  await wait(page);
  await shot(page, tag, '3-decks');
  await ctx.close();
  await extras(w, h, tag);
}

// ── telas novas: histórico, replay, estatísticas, capa, comparar, runas, palavra-chave, copiar ──
// Conta com partidas de verdade (scripts/histseed.ts: partidas aleatórias gravadas como a interface grava).
async function extras(w, h, tag) {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, isMobile: w < 700 });
  await ctx.addInitScript((data) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, seed);
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|net::/.test(m.text()) && errors.push(tag + ': ' + m.text()));
  page.on('pageerror', (e) => errors.push(tag + ' pageerror: ' + e.message));
  await page.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
  await wait(page, 600);
  await shot(page, tag, '7-inicio-historico');
  await tap(page, '[data-act=history]');
  await wait(page, 500);
  await shot(page, tag, '8-historico');
  // replay a um clique e de volta ao histórico
  await tap(page, '[data-db=hopen]');
  await page.waitForSelector('.tt-dock.replay', { timeout: 10000 }).catch(() => errors.push(tag + ': replay não abriu'));
  await wait(page, 400);
  await shot(page, tag, '9-replay');
  await tap(page, '[data-act=rexit]');
  await wait(page, 300);
  if (!(await page.$('.hist'))) errors.push(tag + ': sair do replay não voltou ao histórico');
  // Meus decks com estatísticas; editor do deck com partidas
  await tap(page, '[data-db=tolist]');
  await wait(page);
  await shot(page, tag, '10-decks-stats');
  const ids = await page.$$eval('.decktile [data-db=edit].dtname', (els) => els.map((e) => e.dataset.deck));
  const withStats = await page.$$eval('.decktile', (els) => els.map((e) => !!e.querySelector('.dtstats')));
  await tap(page, `.dtname[data-deck="${ids[withStats.indexOf(true)] ?? ids[0]}"]`);
  await wait(page);
  const mobile = w < 900;
  if (mobile) {
    await tap(page, '[data-db=tab][data-tab=deck]');
    await wait(page, 200);
  }
  await tap(page, '[data-db=statsopen]');
  await wait(page, 200);
  await page.$eval('.dstats', (el) => el.scrollIntoView({ block: 'start' }));
  await wait(page, 150);
  await shot(page, tag, '11-estatisticas');
  // runas sugeridas
  await tap(page, '[data-db=runesug]');
  await wait(page, 150);
  await page.$eval('.runesug', (el) => el.scrollIntoView({ block: 'center' }));
  await shot(page, tag, '12-runas');
  // capa: escolhe o campeão e mexe no recorte
  await page.evaluate(() => window.scrollTo(0, 0));
  await tap(page, '[data-db=cover]');
  await wait(page, 300);
  await shot(page, tag, '13-capa');
  await tap(page, '.cvc:nth-child(2)');
  await wait(page, 200);
  for (const [id, v] of [['cvy', 22], ['cvz', 150]]) {
    await page.$eval(`#${id}`, (el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, v);
  }
  await wait(page, 200);
  await shot(page, tag, '13b-capa-recorte');
  await tap(page, '.cvbox [data-db=closemodal]');
  await wait(page, 200);
  // duplicar, mexer e comparar com a original
  await tap(page, '[data-db=dupedit]');
  await wait(page, 300);
  for (let i = 0; i < 2; i++) await tap(page, '.dbside .drow [data-db=rsub]');
  await tap(page, '.dbside .drow:last-of-type [data-db=radd]');
  await wait(page, 200);
  await tap(page, '[data-db=compare]');
  await wait(page, 300);
  await shot(page, tag, '14-comparar');
  await page.keyboard.press('Escape');
  await wait(page, 200);
  // biblioteca: filtro por palavra-chave + tempo de um clique em "+" com a grade cheia
  if (mobile) {
    await tap(page, '[data-db=tab][data-tab=cards]');
    await wait(page, 200);
  }
  const t = await page.evaluate(async () => {
    const add = () => document.querySelector('.dbgrid .dbcard:not(.illegal) [data-db=primary]');
    const sub = () => document.querySelector('.dbgrid .dbcard [data-db=sub]:not([disabled])');
    const res = [];
    for (let i = 0; i < 6; i++) {
      const b = (i % 2 ? sub() : add());
      const t0 = performance.now();
      b?.click();
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      res.push(performance.now() - t0);
    }
    return { ms: res.map((x) => Math.round(x)), tiles: document.querySelectorAll('.dbgrid .dbcard').length };
  });
  console.log(tag, 'clique na biblioteca (ms):', t.ms.join(' '), '· cartas na grade:', t.tiles);
  if (mobile && !(await page.$('.dbfilters.more'))) await tap(page, '[data-db=more]');
  await tap(page, '[data-fkw=Deathknell]');
  await wait(page, 300);
  await shot(page, tag, '15-palavra-chave');
  // escolha da lenda: campeões com a tag
  await tap(page, '[data-db=clear]');
  await tap(page, '[data-fcat=legend]');
  await wait(page, 300);
  await shot(page, tag, '16-lendas');
  // copiar quando a área de transferência falha (como às vezes no app do Claude)
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('negado')) }, configurable: true });
  });
  if (mobile) {
    await tap(page, '[data-db=tab][data-tab=deck]');
    await wait(page, 200);
  }
  await tap(page, '[data-db=copytext]');
  await wait(page, 400);
  if (!(await page.$('#copybox textarea'))) errors.push(tag + ': caixa de copiar não abriu');
  const sel = await page.evaluate(() => {
    const ta = document.querySelector('#copybox textarea');
    return ta ? ta.selectionEnd - ta.selectionStart === ta.value.length && ta.value.length > 0 : false;
  });
  if (!sel) errors.push(tag + ': texto da caixa de copiar não está selecionado');
  await shot(page, tag, '17-copiar');
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'sem erros no console');
