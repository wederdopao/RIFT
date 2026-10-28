// Percorre o tutorial "Aprender a jogar" inteiro pela interface, como um jogador: em cada passo clica (ou toca) no que a
// seta aponta, confere que outra jogada é barrada com a explicação, sai no meio e continua de onde parou, e no fim
// começa a partida de verdade contra a IA (Fácil). Tira um print de cada passo.
// Uso: node scripts/tutorialplay.mjs <pasta> (SIZES=1366x768,390x844; precisa de npm run build antes)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { executablePath } from './browser.mjs';

const OUT = process.argv[2] || 'docs/prints/tutorial';
const SIZES = (process.env.SIZES || '1366x768,390x844').split(',').map((s) => s.split('x').map(Number));
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath });
const errors = [];
const fail = (m) => {
  throw new Error(m + (errors.length ? '\n' + errors.join('\n') : ''));
};

for (const [w, h] of SIZES) {
  const tag = `${w}x${h}`;
  const touch = w < 700;
  const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`${tag} console: ${m.text()}`));
  await page.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
  await page.waitForTimeout(400);
  if (touch && !(await page.evaluate(() => matchMedia('(hover: none), (pointer: coarse)').matches))) fail('a tela de toque não foi emulada');

  // primeira visita: a sugestão aparece na tela inicial
  if (!(await page.$('.tut-hello [data-tut=start]'))) fail('sem a sugestão do tutorial na primeira visita');
  await page.screenshot({ path: `${OUT}/${tag}-00-inicio.jpg`, quality: 72 });
  await page.click('.tut-hello [data-tut=start]');
  await page.waitForTimeout(500);

  const stepId = async () => {
    await page.waitForSelector('.tut-box', { timeout: 4000 }).catch(() => {});
    return page.$eval('.tut-box', (e) => e.dataset.step).catch(() => null);
  };
  const ring = () =>
    page.evaluate(() => {
      const r = document.querySelector('.tut-ring');
      if (!r || r.hidden) return null;
      const b = r.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    });
  const press = async (x, y) => (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  // JPEG: os prints vão para o repositório (docs/prints/tutorial)
  const shot = async (n, id, extra = '') => page.screenshot({ path: `${OUT}/${tag}-${String(n).padStart(2, '0')}-${id}${extra}.jpg`, quality: 72 });
  // a caixa nunca pode cobrir o que a seta aponta
  const boxCoversTarget = () =>
    page.evaluate(() => {
      const r = document.querySelector('.tut-ring');
      const b = document.querySelector('.tut-box');
      if (!r || r.hidden || !b) return false;
      const x = r.getBoundingClientRect();
      const y = b.getBoundingClientRect();
      const ox = Math.min(x.right, y.right) - Math.max(x.left, y.left);
      const oy = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
      return ox > 8 && oy > 8 ? `${Math.round(ox)}×${Math.round(oy)}` : false;
    });

  let n = 1;
  let last = '';
  let tries = 0;
  let checkedBlock = false;
  let exited = false;
  for (let k = 0; k < 400; k++) {
    const id = await stepId();
    if (!id) {
      await page.screenshot({ path: `${OUT}/${tag}-erro.jpg`, quality: 72 });
      fail(`${tag}: a caixa do tutorial sumiu (${await page.evaluate(() => document.body.className + ' ' + !!document.getElementById('tut-layer') + ' ' + (document.getElementById('tut-layer')?.innerHTML.slice(0, 400) ?? -1))})`);
    }
    const kind = await page.$eval('.tut-box', (e) => [...e.classList].find((c) => c.startsWith('k-')).slice(2));
    if (id !== last) {
      await page.waitForTimeout(kind === 'watch' ? 150 : 450);
      await shot(n++, id);
      const cov = await boxCoversTarget();
      if (cov) errors.push(`${tag}: no passo ${id} a caixa cobre o alvo (${cov})`);
      last = id;
      tries = 0;
    } else if (++tries > 60) fail(`${tag}: parado no passo ${id}`);
    if (kind === 'end') break;
    if (kind === 'watch') {
      await page.waitForTimeout(300);
      continue;
    }
    if (kind === 'info') {
      // no meio do tutorial: sai e continua de onde parou
      if (id === 'combat' && !exited) {
        exited = true;
        await page.click('.tut-box [data-tut=exit]');
        await page.waitForTimeout(300);
        if (await page.$('.tut-box')) fail('Sair não fechou o tutorial');
        const banner = await page.$eval('.tut-hello', (e) => e.textContent).catch(() => '');
        if (!/pela metade/.test(banner)) fail('a tela inicial não oferece continuar o tutorial');
        await shot(n++, 'saiu', '-inicio');
        await page.click('.tut-hello [data-tut=start]');
        await page.waitForTimeout(600);
        if ((await stepId()) !== 'combat') fail(`continuou no passo errado: ${await stepId()}`);
        continue;
      }
      await page.click('.tut-box [data-tut=next]');
      await page.waitForTimeout(250);
      continue;
    }
    // act / read: confere que outra jogada é barrada (uma vez), depois faz a do passo
    if (id === 'play1' && !checkedBlock) {
      checkedBlock = true;
      const before = await page.evaluate(() => window.__rb.game.answers.length);
      // (o botão pode estar sob a caixa no celular: o clique vai direto nele)
      await page.$eval('.tt-endbtn', (e) => e.click());
      await page.waitForTimeout(250);
      const m = await page.$eval('.tut-msg', (e) => e.textContent).catch(() => '');
      if (!m) fail('encerrar o turno no passo de jogar não foi explicado');
      if ((await page.evaluate(() => window.__rb.game.answers.length)) !== before) fail('a jogada errada passou');
      await shot(n++, id, '-barrado');
      // o que não é do passo fica apagado
      if (!(await page.$('.tt-endbtn.tut-off'))) fail('o botão de encerrar não ficou apagado');
    }
    const r = await ring();
    if (!r) {
      await page.waitForTimeout(300);
      continue;
    }
    if (kind === 'read' && !touch) await page.mouse.move(r.x, r.y);
    else await press(r.x, r.y);
    await page.waitForTimeout(kind === 'read' ? 1300 : 450);
    if (touch && id !== last) continue;
    // painel de confirmar aberto: mais um print (mostra o "Jogar" apontado)
    if ((await page.$('.tt-arm')) && (await stepId()) === id && tries === 0) await shot(n++, id, '-confirmar');
  }
  if ((await stepId()) !== 'win') fail(`${tag}: não chegou ao fim`);
  const pts = await page.evaluate(() => window.__rb.game.engine.pl.map((p) => p.points));
  if (pts[0] < 8) fail(`${tag}: terminou sem vencer (${pts})`);
  // conta: tutorial concluído
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem('riftbound-mesa-conta-v1')).profiles);
  if (!Object.values(done).some((p) => p.tutorial?.done)) fail('a conta não guardou o tutorial como concluído');
  // agora jogue de verdade: partida contra a IA (Fácil)
  await page.click('.tut-box [data-tut=easy]');
  await page.waitForTimeout(800);
  if (await page.$('.tut-box')) fail('a caixa do tutorial continuou na partida de verdade');
  const real = await page.evaluate(() => ({ lvl: window.__rb.game.cfg.aiLevel, tut: document.body.classList.contains('tut'), names: window.__rb.game.cfg.names }));
  if (real.lvl !== 'easy' || real.tut) fail(`a partida de verdade não é contra a IA Fácil: ${JSON.stringify(real)}`);
  await shot(n++, 'partida-de-verdade');
  // na volta à tela inicial o botão mostra "Concluído"
  await page.evaluate(() => {
    localStorage.removeItem('riftbound-mesa-v1');
  });
  await page.goto('file://' + process.cwd() + '/dist/riftbound-mesa.html');
  await page.waitForTimeout(400);
  const btn = await page.$eval('.tut-mode', (e) => e.textContent);
  if (!/Concluído/.test(btn)) fail(`botão do tutorial sem "Concluído": ${btn}`);
  if (await page.$('.tut-hello')) fail('a sugestão da primeira visita voltou depois de concluir');
  console.log(`${tag}: tutorial completo em ${n - 1} prints (pontos ${pts.join(' × ')})`);
  await page.close();
}
await browser.close();
if (errors.length) {
  console.log(errors.join('\n'));
  process.exit(1);
}
console.log('sem erros');
