// Teste do jogo online com vários navegadores: hub de salas, partida, espectador, chat, pedido de desfazer,
// reconexão (convidado recarrega; anfitrião cai e volta) e informação oculta (a memória da página do convidado e a do
// espectador não têm as cartas da mão do anfitrião; o espectador também não tem as do convidado).
// Precisa de: dist/site servido em http://127.0.0.1:8080 e, no modo mqtt, `node scripts/mqttbroker.cjs 8888`
// (outras portas: SITE_URL=http://127.0.0.1:8180/ MQTT_URL=ws://127.0.0.1:8988).
// node scripts/onlinetest.mjs [pasta dos prints] [passos]      MODE=room simula o canal "room" do app do Claude.
import { chromium } from 'playwright-core';
import { executablePath } from './browser.mjs';
const OUT = process.argv[2] || '.';
const MAX = Number(process.argv[3] || 600);
const URL = process.env.SITE_URL || 'http://127.0.0.1:8080/';
const browser = await chromium.launch({ executablePath });
const errors = [];
const checks = [];
const ok = (cond, what) => {
  checks.push(`${cond ? 'ok ' : 'FALHOU'} ${what}`);
  if (!cond) errors.push(what);
};
const MODE = process.env.MODE || 'mqtt'; // mqtt (retransmissor local) | room (canal do app do Claude, simulado)
const DROP = Number(process.env.DROP || 0); // fração de mensagens perdidas no modo room

// ── canal "room" simulado: cada página no seu contexto (armazenamento separado), o Node repassa as mensagens ──
// salas: nome → peer → { page, presence }
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
    if (Math.random() < DROP) return;
    for (const [peer, v] of members) if (peer !== m.peer) deliver(v.page, { room: m.room, kind: 'msg', topic: m.topic, data: m.data, peer: m.peer });
  }
}
/** Página fechada/recarregada: sai de todas as salas (a presença some). */
function dropPage(page) {
  for (const [rn, members] of rooms) {
    let changed = false;
    for (const [peer, v] of members) if (v.page === page) members.delete(peer), (changed = true);
    if (changed) pushPeers(rn);
  }
}

async function newCtx(tag, w = 1300, h = 900, mobile = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile });
  if (MODE === 'room') await ctx.exposeBinding('__roomOut', ({ page }, m) => roomOut(page, m));
  await ctx.addInitScript(
    ([mode, cid, mqttUrl]) => {
      window.__RB_CID__ = cid;
      if (mode === 'mqtt') {
        window.__RB_MQTT__ = [mqttUrl];
        return;
      }
      const joined = new Map(); // nome → { listeners, peersFns, peers }
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
async function newPage(ctx, tag) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(tag + ': ' + e.message));
  page.on('framenavigated', (f) => f === page.mainFrame() && dropPage(page));
  page.on('close', () => dropPage(page));
  return page;
}
async function open(tag, w, h, mobile) {
  const ctx = await newCtx(tag, w, h, mobile);
  const page = await newPage(ctx, tag);
  return page;
}
const hubRoom = (code) => `.hub-room[data-room="${code}"]`;
async function goOnline(page, name) {
  await page.goto(URL);
  await page.click('[data-act=mode][data-mode=online]');
  if (name) await page.fill('#name0', name);
}
async function createRoom(page, name, roomName, pub) {
  await goOnline(page, name);
  if (roomName) await page.fill('#roomname', roomName);
  await page.click(`[data-act=roomvis][data-pub="${pub ? 1 : 0}"]`);
  await page.click('[data-act=host]');
  await page.waitForSelector('.roomcode');
  await page.waitForFunction(() => !document.querySelector('.lstatus')?.textContent.includes('Abrindo'));
  return (await page.textContent('.roomcode')).trim();
}

// ── 1. salas: pública (A), privada (P) ──
let A = await open('host');
const code = await createRoom(A, 'Weder', 'Mesa do Weder', true);
console.log('sala pública', code);
const P = await open('priv', 1000, 700);
const code2 = await createRoom(P, 'Paula', 'Só convidados', false);
console.log('sala privada', code2);

// ── 2. convidado acha a sala na lista e entra por ela ──
const B = await open('guest', 400, 860);
await goOnline(B, 'Amigo');
await B.click('[data-act=pickdeck][data-seat="0"]');
await B.click('[data-act=setdeck][data-deck="pre:1"]');
await B.waitForSelector(hubRoom(code), { timeout: 15000 });
const pubText = await B.textContent(hubRoom(code));
ok(pubText.includes('Mesa do Weder') && pubText.includes('Weder') && pubText.includes('Esperando'), 'sala pública aparece na lista do outro (nome, anfitrião, esperando)');
await B.waitForTimeout(2500);
ok(!(await B.$(hubRoom(code2))), 'sala privada não aparece na lista');
await B.click(`${hubRoom(code)} [data-act=lobjoin]`);
await A.waitForSelector('[data-act=ostart]:not([disabled])', { timeout: 15000 });
ok(true, 'entrou pela lista');

// ── 3. sala privada: entra por código ──
const D = await open('privguest', 900, 700);
await goOnline(D, 'Visita');
await D.fill('#joincode', code2);
await D.click('[data-act=join]');
await P.waitForSelector('[data-act=ostart]:not([disabled])', { timeout: 15000 }).then(
  () => ok(true, 'sala privada: entrou pelo código'),
  () => ok(false, 'sala privada: entrou pelo código'),
);

await A.screenshot({ path: `${OUT}/online-lobby.png` });
await A.click('[data-act=ostart]');
await B.waitForSelector('.tt-mat', { timeout: 10000 });

// ── 4. hub com uma sala em andamento e uma aberta; prints; sala que cai some ──
let E = await open('zed', 1000, 700);
const code3 = await createRoom(E, 'Zed', '', true);
const C = await open('watch', 1300, 900);
await goOnline(C, 'Plateia');
await C.waitForSelector(`${hubRoom(code)}.playing`, { timeout: 15000 });
await C.waitForSelector(hubRoom(code3), { timeout: 15000 });
const liveText = await C.textContent(hubRoom(code));
ok(/\d+ × \d+/.test(liveText) && /turno \d+|começando/.test(liveText) && liveText.includes('Assistir'), 'sala em andamento: placar, turno e Assistir');
ok((await C.textContent(hubRoom(code3))).includes('Sala de Zed'), 'nome padrão "Sala de <nome>"');
ok(!(await C.$(hubRoom(code2))), 'sala privada fora da lista (também com partida rolando)');
await C.waitForTimeout(800);
await C.screenshot({ path: `${OUT}/hub-desktop.png` });
const M = await open('mobile', 390, 844, true);
await goOnline(M, 'Celular');
await M.waitForSelector(hubRoom(code3), { timeout: 15000 });
await M.waitForTimeout(800);
const hubBox = await M.$('.seat.hub');
await hubBox.scrollIntoViewIfNeeded();
await M.screenshot({ path: `${OUT}/hub-mobile.png` });
await hubBox.screenshot({ path: `${OUT}/hub-mobile-quadro.png` });
const sw = await M.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(sw <= 0, 'celular sem rolagem horizontal no hub');
// a sala do Zed cai sem fechar (aba fechada): some da lista
await E.close();
await C.waitForSelector(hubRoom(code3), { state: 'detached', timeout: 40000 }).then(
  () => ok(true, 'sala que caiu some da lista'),
  () => ok(false, 'sala que caiu some da lista'),
);
// fecha a sala privada
await P.click('[data-act=leave]');
await M.close();
await D.close();

// ── 5. espectador pela lista ──
await C.click(`${hubRoom(code)} [data-act=lobwatch]`);
await C.waitForSelector('.tt-mat', { timeout: 20000 });
ok(true, 'espectador entrou pela lista');

// ── 6. partida com chat, pedido de desfazer e reconexão ──
let seed = 7;
let batches = 0;
let arms = 0;
let trigs = 0;
const rnd = (n) => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed % n;
};
const manualOn = new Set();
async function step(page) {
  try {
    return await step0(page);
  } catch {
    return 'wait'; // a tela redesenhou no meio do clique: tenta de novo no próximo passo
  }
}
async function step0(page) {
  if (await page.$('.decision.over')) return 'over';
  if (await page.$('.decision.thinking')) return 'wait';
  if (await page.$('.tt-undoask')) return 'wait';
  if (!manualOn.has(page)) {
    const mp = await page.$('.tt-mpay:not([disabled])');
    if (mp) {
      await mp.click();
      manualOn.add(page);
      return 'acted';
    }
  }
  const movable = await page.$$('.tt-mat .card.movable');
  if (movable.length && (await page.$('.tt-dock:not(.ask) .tt-endbtn')) && !(await page.$('.tt-overlay [data-opt]')) && rnd(3) === 0) {
    await movable[rnd(movable.length)].click({ timeout: 2000 });
    if (await page.$('.tt-ctx [data-act=movesel]')) await page.click('.tt-ctx [data-act=movesel]');
    const dests = await page.$$('[data-dest]');
    if (dests.length) {
      const box = await dests[rnd(dests.length)].boundingBox();
      await page.mouse.click(box.x + 8, box.y + box.height - 8);
      batches++;
    }
    await page.keyboard.press('Escape');
    return 'acted';
  }
  if (await page.$('[data-act=trigok]')) { const ups = await page.$$('.tt-trig [data-act=trigup]:not([disabled])'); if (ups.length && rnd(2)) await ups[rnd(ups.length)].click(); await page.click('[data-act=trigok]'); trigs++; return 'acted'; }
  // confirmar antes de jogar: às vezes joga clicando na carta (painel) e confirmando
  const lit = await page.$$('.tt-handrow.bottom .card.actionable');
  if (lit.length && (await page.$('.tt-dock:not(.ask) .tt-endbtn')) && !(await page.$('.tt-overlay [data-opt]')) && rnd(4) === 0) {
    await lit[rnd(lit.length)].click({ timeout: 2000 });
    const go = await page.$('.tt-arm [data-act=armgo]');
    if (go) { await go.click(); arms++; } else await page.keyboard.press('Escape');
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
// o que é público tem de bater nas três telas (respostas, turno, pontos, tamanhos de mão/deck, mesa e descarte)
const sig = (p) => p.evaluate(() => window.__rb.sig());
const nAns = async (p) => JSON.parse(await sig(p))?.[0] ?? 0;

// ── informação oculta: procura na memória da página (heap snapshot pelo CDP) objetos de carta com estes códigos ──
async function heapSnapshot(page) {
  const cdp = await page.context().newCDPSession(page);
  const chunks = [];
  cdp.on('HeapProfiler.addHeapSnapshotChunk', (e) => chunks.push(e.chunk));
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false });
  await cdp.detach();
  return JSON.parse(chunks.join(''));
}
/** Na memória: objetos de carta em jogo (com `code` e `zoneVersion`) com estes códigos e textos JSON com "code":"X". */
function heapFind(snap, codes) {
  const { node_fields: nf, edge_fields: ef, node_types: nt, edge_types: et } = snap.snapshot.meta;
  const N = nf.length;
  const E = ef.length;
  const nodes = snap.nodes;
  const edges = snap.edges;
  const strs = snap.strings;
  const tType = nf.indexOf('type');
  const tName = nf.indexOf('name');
  const tEdges = nf.indexOf('edge_count');
  const eType = ef.indexOf('type');
  const eName = ef.indexOf('name_or_index');
  const eTo = ef.indexOf('to_node');
  const nodeTypes = nt[tType];
  const edgeTypes = et[eType];
  const want = new Set(codes);
  const objs = new Map();
  let e = 0;
  for (let n = 0; n < nodes.length; n += N) {
    const cnt = nodes[n + tEdges];
    let code = null;
    let zv = false;
    if (nodeTypes[nodes[n + tType]] === 'object')
      for (let k = 0; k < cnt; k++) {
        const b = (e + k) * E;
        if (edgeTypes[edges[b + eType]] !== 'property') continue;
        const name = strs[edges[b + eName]];
        if (name === 'zoneVersion') zv = true;
        else if (name === 'code') {
          const to = edges[b + eTo];
          if (nodeTypes[nodes[to + tType]] === 'string') code = strs[nodes[to + tName]];
        }
      }
    if (zv && code && want.has(code)) objs.set(code, (objs.get(code) || 0) + 1);
    e += cnt;
  }
  const json = codes.filter((c) => strs.some((x) => x.includes(`"code":"${c}"`)));
  return { objs: [...objs.keys()], json };
}
/** Cartas escondidas de `secretSide` que a página `page` não pode ver: não podem estar na memória dela. */
async function hiddenCheck(page, label, sides) {
  const host = A;
  const secret = await host.evaluate((sides) => {
    const e = window.__rb.game.engine;
    return sides.flatMap((p) => e.pl[p].hand.map((id) => e.objs[id].code));
  }, sides);
  // tira o que a página vê legitimamente (mesa, descarte, a própria mão e a lista do próprio deck)
  const visible = await page.evaluate(() => {
    const e = window.__rb.game.engine;
    const s = new Set(Object.values(e.objs).map((o) => o.code));
    for (const d of e.cfg.decks) for (const c of [d.legend, d.champion, ...(d.battlefields || []), ...(d.main || []).map((x) => x[0]), ...(d.runes || []).map((x) => x[0])]) s.add(c);
    return [...s];
  });
  const codes = [...new Set(secret)].filter((c) => !visible.includes(c));
  if (!codes.length) return false;
  const snap = await heapSnapshot(page);
  const r = heapFind(snap, codes);
  ok(!r.objs.length && !r.json.length, `${label}: memória da página sem as cartas escondidas (${codes.join(', ')}) — objetos: ${r.objs.join(', ') || 'nenhum'}; JSON: ${r.json.join(', ') || 'nenhum'}`);
  // o detector funciona: na memória do anfitrião as mesmas cartas aparecem
  const hs = heapFind(await heapSnapshot(host), codes);
  ok(hs.objs.length > 0, `${label}: o detector acha as cartas na memória do anfitrião (${hs.objs.join(', ')})`);
  const hand = await page.$$eval('.tt-handrow.top .card:not(.back)', (els) => els.length);
  ok(!hand, `${label}: nenhuma carta da mão do anfitrião desenhada`);
  return true;
}
async function settle(ms = 8000) {
  // espera os dois lados (e o espectador) chegarem ao mesmo estado
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const [a, b, c] = [await sig(A), await sig(B), await sig(C)];
    if (a === b && b === c) return true;
    await A.waitForTimeout(250);
  }
  return false;
}

/** Pedido de desfazer: `from` pede, `to` responde. Tenta até cair no caso "o oponente já agiu". */
async function undoRequest(from, to, accept) {
  if (!(await settle())) return null;
  if (await from.$('.tt-undoask')) return null;
  // localizador, não ElementHandle: a mesa redesenha o botão a cada mensagem e um handle velho fica solto do DOM
  const btn = from.locator('[data-act=undo]:not([disabled])').first();
  if (!(await btn.count())) return null;
  const before = await nAns(from);
  if (!(await btn.click({ timeout: 4000 }).then(() => true, () => false))) return null;
  const asked = await to.waitForSelector('.tt-undoask', { timeout: 4000 }).catch(() => null);
  if (!asked) return null; // foi desfeito direto (a jogada era só dele): não é o caso do pedido
  ok(!(await C.$('.tt-undoask')), 'espectador não vê o pedido de desfazer');
  await to.click(accept ? '.tt-undoask [data-act=undoyes]' : '.tt-undoask [data-act=undono]');
  await to.waitForSelector('.tt-undoask', { state: 'detached', timeout: 4000 }).catch(() => {});
  const synced = await settle();
  const after = await nAns(from);
  if (accept) ok(synced && after < before, `desfazer aceito (${before} → ${after} respostas, telas iguais)`);
  else {
    // a recusa viaja até quem pediu: espera o aviso aparecer (as telas já estão iguais, nada mudou)
    await from.waitForFunction(() => document.querySelector('.tt-dock')?.textContent.includes('recusou'), null, { timeout: 5000 }).catch(() => {});
    const note = await from.textContent('.tt-dock').catch(() => '');
    ok(synced && after === before && note.includes('recusou'), 'desfazer recusado (nada muda, quem pediu vê a recusa)');
  }
  return true;
}

let chatDone = false;
let undoDone = { hostAcc: false, guestAcc: false, refuse: false };
let guestReload = false;
let hostCrash = false;
let hiddenDone = false;
let i = 0;
for (; i < MAX; i++) {
  const a = await step(A);
  const b = await step(B);
  if (a === 'over' && b === 'over') break;
  if (a === 'wait' && b === 'wait') await A.waitForTimeout(80);
  if (i === 20 && !chatDone) {
    chatDone = true;
    await A.click('[data-act=chattog]');
    await A.click('.tt-chatq [data-text="Boa!"]');
    await B.click('[data-act=chattog]');
    await B.fill('#chatin', 'valeu, bora');
    await B.press('#chatin', 'Enter');
    const seen = async (p, t) => p.waitForFunction((t) => [...document.querySelectorAll('.tt-chatlog p')].some((e) => e.textContent.includes(t)), t, { timeout: 8000 }).then(() => true, () => false);
    ok((await seen(B, 'Boa!')) && (await seen(A, 'valeu, bora')), 'chat entre os jogadores (pronto e texto livre)');
    ok((await seen(C, 'Boa!')) && (await seen(C, 'valeu, bora')), 'espectador lê o chat');
    ok(!(await C.$('[data-act=chattog]')), 'espectador não tem botão de chat');
    await A.screenshot({ path: `${OUT}/online-chat.png` });
  }
  if (i >= 30 && i % 6 === 0 && !(undoDone.hostAcc && undoDone.guestAcc && undoDone.refuse)) {
    if (!undoDone.hostAcc) undoDone.hostAcc = !!(await undoRequest(A, B, true));
    else if (!undoDone.guestAcc) undoDone.guestAcc = !!(await undoRequest(B, A, true));
    else undoDone.refuse = !!(await undoRequest(A, B, false));
  }
  if (i === 100 && !guestReload) {
    // convidado recarrega a página no meio da partida: volta sozinho para a sala, no lance certo
    guestReload = true;
    await B.reload();
    await B.waitForSelector('.tt-mat', { timeout: 15000 });
    ok(await settle(15000), 'convidado recarregou e voltou sozinho no mesmo lance');
  }
  if (i === 140 && !hostCrash) {
    // anfitrião cai (aba fechada): o convidado vê o aviso; ele abre de novo e a partida continua
    hostCrash = true;
    const ctx = A.context();
    await settle(); // a jogada que ainda estava a caminho chega antes de medir
    const n0 = await nAns(A);
    await A.close();
    const warned = await B.waitForSelector('.tt-netwarn', { timeout: 25000 }).then(() => true, () => false);
    ok(warned, 'convidado vê o aviso quando o anfitrião cai');
    if (warned) await B.screenshot({ path: `${OUT}/online-hostcaiu.png` });
    A = await newPage(ctx, 'host2');
    await A.goto(URL);
    await A.waitForSelector('.tt-mat', { timeout: 15000 });
    await B.waitForSelector('.tt-netwarn', { state: 'detached', timeout: 20000 }).catch(() => {});
    const back = await settle(15000);
    const nA = await nAns(A);
    if (!back || nA !== n0) console.log('diagnóstico: n0', n0, '| A', nA, '| B', await nAns(B), '| C', await nAns(C), '| netchips', await A.textContent('.netchip').catch(() => '-'), '/', await B.textContent('.netchip').catch(() => '-'));
    ok(back && nA === n0, 'anfitrião voltou sozinho e a partida retomou no mesmo lance (espectador junto)');
  }
  if (i === 60) {
    await A.screenshot({ path: `${OUT}/online-host.png` });
    await B.screenshot({ path: `${OUT}/online-guest.png` });
  }
  if (i >= 40 && !hiddenDone && i % 10 === 0 && (await settle())) {
    // informação oculta: convidado não tem a mão do anfitrião; espectador não tem nenhuma das duas
    const g = await hiddenCheck(B, 'convidado', [0]);
    const w = g && (await hiddenCheck(C, 'espectador', [0, 1]));
    hiddenDone = g && w;
  }
}
ok(chatDone, 'chat testado');
ok(undoDone.hostAcc && undoDone.guestAcc && undoDone.refuse, `pedidos de desfazer testados (${JSON.stringify(undoDone)})`);
ok(guestReload && hostCrash, 'reconexões testadas (a partida durou o bastante)');
ok(hiddenDone, 'informação oculta conferida na memória do convidado e do espectador');
await A.waitForTimeout(500);
const sa = await sig(A);
const sb = await sig(B);
let sc = await sig(C);
for (let k = 0; k < 20 && sc !== sa; k++) {
  await C.waitForTimeout(500);
  sc = await sig(C);
}
const handsHidden = await C.$$eval('.tt-handrow .card:not(.back)', (els) => els.length);
ok(sc === sa, 'espectador em sincronia');
ok(!handsHidden, 'espectador não vê cartas de mão');
ok(sa === sb, 'estados iguais no fim');
// fim: a partida completa chega ao convidado (já sem segredo) e entra no histórico dele, com o replay
if (JSON.parse(sa)?.[3] !== null) {
  const h = await B.waitForFunction(
    () => {
      const k = Object.keys(localStorage).find((x) => x.startsWith('riftbound-mesa-historico-v1:'));
      const o = k ? JSON.parse(localStorage.getItem(k)) : null;
      return o && o.list.length ? o.list.map((e) => `${e.mode} ${e.turns}t ${e.replay ? e.replay.length + 'B' : 'sem replay'}`) : null;
    },
    null,
    { timeout: 8000 },
  ).then((x) => x.jsonValue(), () => null);
  ok(!!h && h.length === 1 && h[0].startsWith('online') && !h[0].includes('sem replay'), `histórico do convidado com o replay completo (${JSON.stringify(h)})`);
}
console.log('mover em lote', batches, '| jogadas confirmadas no painel', arms, '| ordens de efeitos', trigs, '| pagamento manual ligado em', manualOn.size, 'lado(s)');
console.log('passos', i, '| respostas', JSON.parse(sa)?.[0]);
console.log('fim A:', ((await A.textContent('.decision').catch(() => '')) || '').slice(0, 90).replace(/\s+/g, ' '));
console.log('fim B:', ((await B.textContent('.decision').catch(() => '')) || '').slice(0, 90).replace(/\s+/g, ' '));
await B.screenshot({ path: `${OUT}/online-guest-end.png` });
console.log(checks.join('\n'));
console.log(errors.length ? 'ERROS:\n' + errors.join('\n') : 'sem erros');
await browser.close();
process.exit(errors.length ? 1 : 0);
