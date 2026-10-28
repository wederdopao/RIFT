// Teste do torneio entre amigos com vários navegadores (cada um com a sua conta local):
//  1. eliminação simples, melhor de 1, 3 participantes (um passa direto: bye): o organizador cria, um entra pelo link,
//     outro pelo código; começa; a semifinal é jogada numa sala normal aberta pela tela do torneio (o terceiro assiste);
//     o resultado volta sozinho; participante e organizador recarregam a página no meio; a final; o campeão com o
//     deck nas três telas; o replay da partida aberto por quem não jogou (vem do organizador); torneios passados.
//  2. pontos corridos, melhor de 3: W.O. e resultado lançado pelo organizador, um confronto jogado de verdade em 2–3
//     partidas na mesma sala ("Próxima partida"), tabela e campeão.
// Prints em 1920x1080 (organizador), 1366x768 e 390x844.
// Precisa de: dist/site servido em http://127.0.0.1:8080 e, no modo mqtt, `node scripts/mqttbroker.cjs 8888`
// (outras portas: SITE_URL=... MQTT_URL=...). MODE=room simula o canal "room" do app do Claude.
// node scripts/tourtest.mjs [pasta dos prints]
import { chromium } from 'playwright-core';
import { executablePath } from './browser.mjs';
const OUT = process.argv[2] || '.';
const URL = process.env.SITE_URL || 'http://127.0.0.1:8080/';
const MODE = process.env.MODE || 'mqtt';
const browser = await chromium.launch({ executablePath });
const errors = [];
const checks = [];
const ok = (cond, what) => {
  checks.push(`${cond ? 'ok ' : 'FALHOU'} ${what}`);
  console.log(`${cond ? 'ok ' : 'FALHOU'} ${what}`);
  if (!cond) errors.push(what);
};

// ── canal "room" simulado (como em onlinetest.mjs): cada página no seu contexto, o Node repassa ──
const rooms = new Map();
const deliver = (page, msg) => page.evaluate((m) => window.__roomIn && window.__roomIn(m), msg).catch(() => {});
function pushPeers(rn) {
  const members = rooms.get(rn);
  if (!members) return;
  const peers = [...members.entries()].map(([peer, v]) => ({ peer, presence: v.presence }));
  for (const [, v] of members) deliver(v.page, { room: rn, kind: 'peers', peers });
}
function roomOut(page, m) {
  if (!rooms.has(m.room)) rooms.set(m.room, new Map());
  const members = rooms.get(m.room);
  if (m.kind === 'join') {
    members.set(m.peer, { page, presence: {} });
    pushPeers(m.room);
  } else if (m.kind === 'leave') {
    members.delete(m.peer);
    pushPeers(m.room);
  } else if (m.kind === 'presence') {
    const v = members.get(m.peer);
    if (v) {
      const p = { ...v.presence };
      for (const [k, x] of Object.entries(m.patch)) if (x === null) delete p[k];
      else p[k] = x;
      v.presence = p;
      pushPeers(m.room);
    }
  } else if (m.kind === 'emit') {
    for (const [peer, v] of members) if (peer !== m.peer) deliver(v.page, { room: m.room, kind: 'msg', topic: m.topic, data: m.data, peer: m.peer });
  }
}
function dropPage(page) {
  for (const [rn, members] of rooms) {
    let changed = false;
    for (const [peer, v] of members) if (v.page === page) members.delete(peer), (changed = true);
    if (changed) pushPeers(rn);
  }
}
async function newCtx(tag, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  if (MODE === 'room') await ctx.exposeBinding('__roomOut', ({ page }, m) => roomOut(page, m));
  await ctx.addInitScript(
    ([mode, cid, mqttUrl]) => {
      window.__RB_CID__ = cid;
      // partidas curtas: os dois começam com 7 pontos
      window.__RB_TEST_CFG__ = { startPoints: [7, 7] };
      if (mode === 'mqtt') {
        window.__RB_MQTT__ = [mqttUrl];
        return;
      }
      const joined = new Map();
      window.__roomIn = (m) => {
        const r = joined.get(m.room);
        if (!r) return;
        if (m.kind === 'msg') {
          for (const l of r.listeners) if (l.topic === m.topic) l.fn({ topic: m.topic, data: m.data, isMe: false, sameTab: false, peer: m.peer, by: null, kind: 'viewer', guest: false });
        } else if (m.kind === 'peers') {
          r.peers = m.peers.map((p) => ({ peer: p.peer, presence: p.presence, isMe: p.peer === r.peer, sameTab: p.peer === r.peer, by: null, kind: 'viewer', guest: false, updatedAt: Date.now() }));
          for (const fn of r.peersFns) fn({ peers: r.peers, joined: [], left: [], updated: [] });
        }
      };
      window.claude = {
        use: async (name) => {
          if (name !== 'room') return null;
          return {
            join: async (rn) => {
              if (joined.has(rn)) return joined.get(rn).api;
              const r = { listeners: [], peersFns: [], peers: [], peer: Math.random().toString(36).slice(2) };
              joined.set(rn, r);
              window.__roomOut({ room: rn, kind: 'join', peer: r.peer });
              r.api = {
                name: rn,
                emit: async (topic, data) => {
                  if (new TextEncoder().encode(JSON.stringify(data)).length > 4096) throw { code: 'invalid_argument', message: 'grande demais' };
                  window.__roomOut({ room: rn, kind: 'emit', peer: r.peer, topic, data });
                },
                on: (topic, fn) => (r.listeners.push({ topic, fn }), () => {}),
                onConnection: (fn) => (setTimeout(() => fn(true), 10), () => {}),
                presence: async (patch) => window.__roomOut({ room: rn, kind: 'presence', peer: r.peer, patch }),
                peers: () => r.peers,
                onPeers: (fn) => (r.peersFns.push(fn), () => {}),
                connected: () => true,
                leave: async () => {
                  joined.delete(rn);
                  window.__roomOut({ room: rn, kind: 'leave', peer: r.peer });
                },
              };
              return r.api;
            },
          };
        },
      };
    },
    [MODE, tag + Math.random().toString(36).slice(2, 6), process.env.MQTT_URL || 'ws://127.0.0.1:8888'],
  );
  return ctx;
}
async function open(tag, name, w, h) {
  const ctx = await newCtx(tag, w, h);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(tag + ': ' + e.message));
  page.on('framenavigated', (f) => f === page.mainFrame() && dropPage(page));
  page.on('close', () => dropPage(page));
  await page.goto(URL);
  // nome da conta local
  await page.evaluate((n) => {
    const k = 'riftbound-mesa-conta-v1';
    const s = JSON.parse(localStorage.getItem(k));
    s.profiles[s.active].name = n;
    localStorage.setItem(k, JSON.stringify(s));
    const st = JSON.parse(localStorage.getItem('riftbound-mesa-v1') || '{}');
    st.settings = { ...(st.settings || {}), names: [n, 'IA'] };
    localStorage.setItem('riftbound-mesa-v1', JSON.stringify(st));
  }, name);
  await page.reload();
  page.tag = tag;
  page.who = name;
  return page;
}
const shot = (p, f) => p.screenshot({ path: `${OUT}/${f}` });

// ── jogar uma partida clicando (como em onlinetest.mjs) ──
let seed = 11;
const rnd = (n) => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed % n;
};
async function step(page) {
  try {
    return await step0(page);
  } catch {
    return 'wait';
  }
}
async function step0(page) {
  if (await page.$('.decision.over')) return 'over';
  if (await page.$('.decision.thinking')) return 'wait';
  if (await page.$('[data-act=trigok]')) {
    await page.click('[data-act=trigok]');
    return 'acted';
  }
  const lt = await page.$('[data-act=optlist]:not(.on)');
  if (lt && !(await page.$('.tt-overlay [data-opt]'))) {
    await lt.click();
    return 'acted';
  }
  const scope = (await page.$('.tt-overlay [data-opt]')) ? '.tt-overlay' : '.tt-optlist';
  const opts = await page.$$eval(`${scope} [data-opt]`, (els) => els.map((e) => e.dataset.opt));
  if (!opts.length) return 'wait';
  const cs = scope === '.tt-overlay' ? '.tt-overlay' : '.tt-dock';
  const multi = await page.$(`${cs} [data-act=confirm]`);
  if (multi) {
    for (const o of opts) {
      if ((await page.$(`${cs} [data-act=confirm]:not([disabled])`)) && rnd(2)) break;
      await page.click(`${scope} [data-opt="${o}"]`);
    }
    const okb = await page.$(`${cs} [data-act=confirm]:not([disabled])`);
    if (okb) await okb.click();
    return 'acted';
  }
  const non = opts.filter((o) => o !== 'end' && o !== 'pass');
  const pick = non.length && rnd(10) < 7 ? non[rnd(non.length)] : opts.includes('end') ? 'end' : opts.includes('pass') ? 'pass' : opts[0];
  await page.click(`${scope} [data-opt="${pick}"]`);
  return 'acted';
}
async function playOut(a, b, max = 900) {
  for (let i = 0; i < max; i++) {
    const x = await step(a);
    const y = await step(b);
    if (x === 'over' && y === 'over') return true;
    if (x !== 'acted' && y !== 'acted') await a.waitForTimeout(80);
  }
  return false;
}

/** As páginas com o botão "Jogar" de um confronto pronto: [anfitrião (lado a), convidado (lado b)]. */
async function readyPlayers(pages, mid) {
  const out = [];
  for (const p of pages) if (await p.$(`.tour-next [data-act=tplay]${mid ? `[data-mid="${mid}"]` : ''}`)) out.push(p);
  return out;
}
/** Joga um confronto: os dois clicam em Jogar, o anfitrião começa, partida até o fim. Devolve [anfitrião, convidado]. */
async function playMatch(pages, label, watcher) {
  let ps = [];
  for (let k = 0; k < 60 && ps.length < 2; k++) {
    ps = await readyPlayers(pages);
    if (ps.length < 2) await pages[0].waitForTimeout(500);
  }
  ok(ps.length === 2, `${label}: os dois jogadores do confronto veem "Jogar"`);
  const mid = await ps[0].getAttribute('.tour-next [data-act=tplay]', 'data-mid');
  for (const p of ps) await p.click(`.tour-next [data-act=tplay][data-mid="${mid}"]`);
  if (watcher) await watcher.click(`.tour-next [data-act=twatch][data-mid="${mid}"]`);
  // quem é o anfitrião (lado a): o que tem o botão Começar
  let host = null;
  for (let k = 0; k < 60 && !host; k++) {
    for (const p of ps) if (await p.$('[data-act=ostart]:not([disabled])')) host = p;
    if (!host) await ps[0].waitForTimeout(500);
  }
  ok(!!host, `${label}: o adversário entrou sozinho na sala do confronto`);
  const guest = ps.find((p) => p !== host);
  return { host, guest, mid };
}
async function runGame(host, guest, label, watcher) {
  await host.click('[data-act=ostart]');
  await guest.waitForSelector('.tt-mat', { timeout: 20000 });
  if (watcher) ok(await watcher.waitForSelector('.tt-mat', { timeout: 20000 }).then(() => true, () => false), `${label}: quem não joga assiste pela tela do torneio`);
  const done = await playOut(host, guest);
  ok(done, `${label}: partida terminou`);
}
/** Sai da sala do confronto de volta para o torneio (o botão visível: o do quadro do fim ou o da barra). */
async function backToTour(p) {
  // o do quadro do fim primeiro (o da barra fica atrás do quadro)
  const ov = p.locator('.tt-overlay [data-act=tourback]');
  const b = (await ov.count()) ? ov.first() : p.locator('[data-act=tourback]:visible').first();
  if (await b.count()) await b.click({ timeout: 5000 }).catch(() => {});
  else await p.locator('[data-act=leave]:visible').first().click({ timeout: 5000 }).catch(() => {});
  await p.waitForSelector('.setup.tour', { timeout: 10000 }).catch(() => {});
}
const playersIn = (p) => p.$$eval('.tour-players li', (els) => els.length).catch(() => 0);

// ═════════════════ 1. eliminação simples, melhor de 1, 3 participantes ═════════════════
let O = await open('org', 'Weder', 1920, 1080);
const A = await open('ana', 'Ana', 1366, 768);
const B = await open('bia', 'Bia', 390, 844);

await O.click('[data-act=tour]');
await O.waitForSelector('.setup.tour .tour-create');
await shot(O, 'torneio-1920-inicio.png');
await O.fill('#tcname', 'Copa dos Amigos');
await O.selectOption('#tcdeck', 'pre:0');
await O.click('[data-act=tcreate]');
await O.waitForSelector('.tour-head .roomcode');
const code = (await O.textContent('.tour-head .roomcode')).trim();
console.log('torneio', code);
ok(/^[A-Z0-9]{6}$/.test(code), 'torneio criado com código de 6 letras');
ok((await O.textContent('.tour-players')).includes('Weder'), 'organizador inscrito com o deck');

// Ana entra pelo link de convite; Bia pelo código
await A.goto(`${URL}#torneio-${code}`);
await A.waitForSelector('.tour-head h1:has-text("Copa dos Amigos")', { timeout: 20000 });
await A.selectOption('#tmydeck', 'pre:1');
await A.click('[data-act=tenter]');
await B.click('[data-act=tour]');
await B.waitForSelector('.tour-join');
await shot(B, 'torneio-390-inicio.png');
await B.fill('#tjcode', code);
await B.click('[data-act=tjoin]');
await B.waitForSelector('.tour-head h1:has-text("Copa dos Amigos")', { timeout: 20000 });
await B.selectOption('#tmydeck', 'pre:0');
await B.click('[data-act=tenter]');
for (let k = 0; k < 40 && (await playersIn(O)) < 3; k++) await O.waitForTimeout(500);
ok((await playersIn(O)) === 3, 'os três aparecem na lista do organizador');
for (let k = 0; k < 40 && (await playersIn(B)) < 3; k++) await B.waitForTimeout(500);
ok((await playersIn(B)) === 3, 'a lista chega aos participantes');
await shot(O, 'torneio-1920-inscricoes.png');
await shot(A, 'torneio-1366-inscricoes.png');

// recarregar antes de começar: continua inscrito
await A.reload();
await A.waitForSelector('.tour-players', { timeout: 20000 });
ok((await A.textContent('.tour-me h2')).includes('inscrito'), 'participante recarregou na tela do torneio e continua inscrito');

await O.click('[data-act=tstart]');
for (const p of [O, A, B]) await p.waitForSelector('.tour-bracket', { timeout: 20000 });
ok(true, 'torneio começou: chave nas três telas');
const byes = await O.$$eval('.tour-bracket .tour-pn.tbd', (els) => els.filter((e) => e.textContent.includes('bye')).length);
ok(byes === 1, 'com 3 participantes, um passa direto (bye)');
await shot(O, 'torneio-1920-chave.png');
await shot(A, 'torneio-1366-chave.png');
await B.screenshot({ path: `${OUT}/torneio-390-chave.png`, fullPage: true });
const sw = await B.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(sw <= 0, 'celular sem rolagem horizontal na tela do torneio');

// semifinal: os dois jogam; o terceiro (bye) assiste
const pages = [O, A, B];
const semi = await playMatch(pages, 'semifinal');
const third = pages.find((p) => p !== semi.host && p !== semi.guest);
await third.click(`.tour-next [data-act=twatch][data-mid="${semi.mid}"]`);
await semi.host.screenshot({ path: `${OUT}/torneio-sala-confronto.png` });
ok((await semi.host.textContent('.lobby')).includes('Confronto do torneio'), 'a sala diz que é do torneio');
await runGame(semi.host, semi.guest, 'semifinal', third);
await semi.guest.waitForTimeout(1500);
const endText = await semi.host.textContent('.tt-overlay, .tt-dock');
ok(endText.includes('Voltar ao torneio') && !endText.includes('Revanche'), 'fim da partida do torneio: "Voltar ao torneio" no lugar da revanche');
await semi.host.screenshot({ path: `${OUT}/torneio-fim-partida.png` });
for (const p of pages) await backToTour(p);
for (const p of pages) await p.waitForSelector('.tour-results li', { timeout: 30000 }).catch(() => {});
for (const p of pages) {
  const got = !!(await p.$('.tour-results li'));
  ok(got, `${p.who}: resultado da semifinal chegou sozinho`);
  if (!got) await p.screenshot({ path: `${OUT}/falha-${p.tag}.png`, fullPage: true });
}

// participante e organizador recarregam
await third.reload();
await third.waitForSelector('.tour-results', { timeout: 20000 });
ok(true, 'participante recarregou e voltou para o torneio com o resultado');
const orgCtx = O.context();
await O.close();
O = await orgCtx.newPage();
O.who = 'Weder';
O.on('pageerror', (e) => errors.push('org2: ' + e.message));
O.on('close', () => dropPage(O));
await O.goto(`${URL}#torneio-${code}`);
await O.waitForSelector('.tour-results', { timeout: 20000 });
ok((await O.textContent('.tour-head .netchip')).includes('organiza'), 'organizador caiu e voltou: continua organizando');
pages[0] = O;

// final
const fin = await playMatch(pages, 'final');
await runGame(fin.host, fin.guest, 'final');
for (const p of [fin.host, fin.guest]) await backToTour(p);
for (const p of pages) await p.waitForSelector('.tour-champ', { timeout: 30000 }).catch(() => {});
const champTexts = await Promise.all(pages.map((p) => p.textContent('.tour-champ').catch(() => '')));
ok(champTexts.every((t) => t && t === champTexts[0] && /deck/.test(t)), `campeão com o deck nas três telas: ${champTexts[0]?.replace(/\s+/g, ' ').slice(0, 80)}`);
await shot(O, 'torneio-1920-campeao.png');
await A.screenshot({ path: `${OUT}/torneio-1366-campeao.png`, fullPage: true });
await B.screenshot({ path: `${OUT}/torneio-390-campeao.png`, fullPage: true });

// replay da semifinal por quem não jogou (pede ao organizador se não tiver)
const viewer = pages.find((p) => p.who !== semi.host.who && p.who !== semi.guest.who && !p.isClosed()) || pages.find((p) => p !== O);
const rpBtns = await viewer.$$('[data-act=trp]');
ok(rpBtns.length >= 2, 'resultados com link para o replay');
await rpBtns[rpBtns.length - 1].click();
ok(await viewer.waitForSelector('[data-act=rexit]', { timeout: 20000 }).then(() => true, () => false), `${viewer.who}: replay da semifinal abriu`);
await viewer.screenshot({ path: `${OUT}/torneio-replay.png` });
await viewer.click('[data-act=rexit]');
ok(!!(await viewer.waitForSelector('.tour-champ', { timeout: 5000 }).catch(() => null)), 'sair do replay volta para o torneio');

// torneios passados
await A.click('[data-act=tback]');
await A.waitForSelector('.tour-list.past');
ok((await A.textContent('.tour-list.past')).includes('Copa dos Amigos') && (await A.textContent('.tour-list.past')).includes('🏆'), 'torneio no histórico dos passados com o campeão');
await shot(A, 'torneio-1366-passados.png');

// ═════════════════ 2. pontos corridos, melhor de 3 ═════════════════
await O.click('[data-act=tback]');
await O.waitForSelector('.tour-create');
await O.fill('#tcname', 'Liga de Outubro');
await O.click('[data-act=tcopt][data-k=format][data-v=rr]');
await O.click('[data-act=tcopt][data-k=bestOf][data-v="3"]');
await O.check('#tcchange');
await O.selectOption('#tcdeck', 'pre:0');
await O.click('[data-act=tcreate]');
await O.waitForSelector('.tour-head .roomcode');
const code2 = (await O.textContent('.tour-head .roomcode')).trim();
for (const [p, d] of [
  [A, 'pre:1'],
  [B, 'pre:0'],
]) {
  await p.fill('#tjcode', code2).catch(async () => {
    await p.click('[data-act=tback]');
    await p.fill('#tjcode', code2);
  });
  await p.click('[data-act=tjoin]');
  await p.waitForSelector('.tour-head h1:has-text("Liga de Outubro")', { timeout: 20000 });
  await p.selectOption('#tmydeck', d);
  await p.click('[data-act=tenter]');
}
for (let k = 0; k < 40 && (await playersIn(O)) < 3; k++) await O.waitForTimeout(500);
await O.click('[data-act=tstart]');
for (const p of pages) await p.waitForSelector('.tour-table', { timeout: 20000 });
ok(true, 'liga começou: tabela nas três telas');

// o organizador dá W.O. num confronto que não é dele e lança o resultado de outro
const orgMine = await O.$$eval('.tour-next li', (els) => els.map((e) => ({ mine: e.classList.contains('mine'), mid: e.querySelector('[data-act=tfix]')?.dataset.mid })));
const notMine = orgMine.find((x) => !x.mine);
const mine = orgMine.filter((x) => x.mine);
await O.click(`.tour-next [data-act=tfix][data-mid="${notMine.mid}"]`);
await O.waitForSelector('.tour-fix');
await O.screenshot({ path: `${OUT}/torneio-corrigir.png` });
await O.click('.tour-fix [data-act=tfixwo][data-side=a]');
await O.waitForSelector('.tour-fix', { state: 'detached' });
await O.click(`.tour-next [data-act=tfix][data-mid="${mine[0].mid}"]`);
await O.selectOption('.tour-fix select[data-i="0"]', '0');
await O.fill('.tour-fix input[data-fix=a][data-i="0"]', '8');
await O.fill('.tour-fix input[data-fix=b][data-i="0"]', '6');
await O.click('.tour-fix [data-act=tfixadd]');
await O.selectOption('.tour-fix select[data-i="1"]', '0');
await O.fill('.tour-fix input[data-fix=a][data-i="1"]', '8');
await O.fill('.tour-fix input[data-fix=b][data-i="1"]', '3');
await O.click('.tour-fix [data-act=tfixsave]');
await O.waitForSelector('.tour-fix', { state: 'detached' });
for (let k = 0; k < 40; k++) {
  const n = await B.$$eval('.tour-results li', (els) => els.length).catch(() => 0);
  if (n >= 2) break;
  await B.waitForTimeout(500);
}
ok((await B.textContent('.tour-results')).includes('W.O.'), 'W.O. e resultado lançado chegam aos participantes');

// o confronto que falta é jogado de verdade, em 2–3 partidas na mesma sala
const liga = await playMatch(pages, 'liga');
let games = 0;
for (; games < 3; games++) {
  if (games === 0) await runGame(liga.host, liga.guest, `liga, partida ${games + 1}`);
  else {
    const next = (await liga.host.$('.tt-overlay [data-act=rematch]')) ?? (await liga.host.$('[data-act=rematch]'));
    if (!next) break;
    ok((await next.textContent()).includes('Próxima partida'), `liga: "Próxima partida" depois da partida ${games}`);
    if (games === 1) await liga.host.screenshot({ path: `${OUT}/torneio-proxima-partida.png` });
    await next.click();
    await liga.guest.waitForSelector('.tt-mat:not(:has(.decision.over))', { timeout: 20000 }).catch(() => {});
    await liga.host.waitForTimeout(800);
    ok(await playOut(liga.host, liga.guest), `liga, partida ${games + 1}: terminou`);
  }
  await liga.host.waitForTimeout(1200);
}
ok(games >= 2, `melhor de 3: ${games} partidas jogadas na mesma sala`);
for (const p of [liga.host, liga.guest]) await backToTour(p);
for (const p of pages) await p.waitForSelector('.tour-champ', { timeout: 30000 }).catch(() => {});
const table = await O.$$eval('.tour-table tbody tr', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
ok(table.length === 3, `tabela: ${table.join(' | ')}`);
ok(!!(await A.$('.tour-champ')) && !!(await B.$('.tour-champ')), 'liga terminou com campeão nas telas');
await O.screenshot({ path: `${OUT}/torneio-1920-tabela.png`, fullPage: true });
await A.screenshot({ path: `${OUT}/torneio-1366-tabela.png` });
await B.screenshot({ path: `${OUT}/torneio-390-tabela.png`, fullPage: true });

console.log('\n' + checks.join('\n'));
console.log(errors.length ? `\n${errors.length} problema(s):\n${[...new Set(errors)].join('\n')}` : '\ntudo certo');
await browser.close();
process.exit(errors.length ? 1 : 0);
