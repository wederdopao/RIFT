// Ranking entre amigos pelo navegador: duas contas jogam uma partida online inteira (anfitrião × convidado). Confere que
// os dois lados contam a partida uma vez só e veem os mesmos números (a própria pontuação e a do amigo), que recarregar a
// página e ver o replay não contam de novo, que a revanche leva a pontuação nova, e tira prints das telas Ranking e
// Perfil (1920x1080, 1366x768, 390x844).
// Precisa de: dist/site servido em http://127.0.0.1:8080 e, no modo mqtt, `node scripts/mqttbroker.cjs 8888`.
// node scripts/rankingtest.mjs [pasta dos prints] [passos]      MODE=room simula o canal "room" do app do Claude.
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

const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('riftbound-mesa-conta-v1')));
const rankOf = async (p) => {
  const s = await store(p);
  return s.profiles[s.active].rank;
};

// ── 1. duas contas: Weder abre a sala, Ana entra pelo código ──
const A = await open('host', 1366, 768);
const code = await createRoom(A, 'Weder', 'Ranking', false);
const B = await open('guest', 1366, 768);
await goOnline(B, 'Ana');
await B.fill('#joincode', code);
await B.click('[data-act=join]');
await A.waitForSelector('[data-act=ostart]:not([disabled])', { timeout: 15000 });
const lobbyTxt = await A.textContent('.lstatus');
ok(/Ana \(1000 pontos\)/.test(lobbyTxt), `anfitrião vê a pontuação do convidado na sala (${lobbyTxt.trim().slice(0, 60)})`);
await B.waitForFunction(() => document.querySelector('.lobby h2')?.textContent.includes('1000 pontos'), null, { timeout: 10000 }).then(
  () => ok(true, 'convidado vê a pontuação do anfitrião'),
  () => ok(false, 'convidado vê a pontuação do anfitrião'),
);
const rA0 = await rankOf(A);
const rB0 = await rankOf(B);
ok(rA0 && rB0 && rA0.id !== rB0.id && rA0.elo === 1000 && rB0.elo === 1000, 'cada conta com identidade própria e 1000 pontos');
ok(rA0.friends[rB0.id]?.name === 'Ana' && rB0.friends[rA0.id]?.name === 'Weder', 'cada um guardou o cartão do outro (pela identidade, não pelo nome)');

// ── 2. partida inteira ──
await A.click('[data-act=ostart]');
await B.waitForSelector('.tt-mat', { timeout: 10000 });
const cfgRank = await A.evaluate(() => window.__rb.game.cfg.rank);
ok(Array.isArray(cfgRank) && cfgRank[0].id === rA0.id && cfgRank[1].id === rB0.id, 'o cfg da partida leva os dois cartões');
let i = 0;
for (; i < MAX; i++) {
  const a = await step(A);
  const b = await step(B);
  if (a === 'over' && b === 'over') break;
  if (a === 'wait' && b === 'wait') await A.waitForTimeout(80);
}
const sa = JSON.parse(await sig(A));
ok(sa?.[3] !== null && sa?.[3] !== undefined, `a partida terminou (${i} passos, vencedor ${sa?.[3]})`);
const winner = sa[3];
// o convidado conta quando chega a partida completa
await B.waitForFunction((id) => {
  const s = JSON.parse(localStorage.getItem('riftbound-mesa-conta-v1'));
  return s.profiles[s.active].rank.log.length === 1;
}, rB0.id, { timeout: 15000 }).catch(() => {});
const rA1 = await rankOf(A);
const rB1 = await rankOf(B);
ok(rA1.log.length === 1 && rB1.log.length === 1, 'os dois contaram a partida');
const dA = rA1.elo - 1000;
const dB = rB1.elo - 1000;
ok(dA === -dB && Math.abs(dA) === 16, `mudanças opostas (${dA} / ${dB})`);
ok((winner === 0) === dA > 0, 'quem venceu ganhou pontos (o anfitrião é a fonte do resultado)');
ok(rA1.friends[rB0.id].elo === rB1.elo && rB1.friends[rA0.id].elo === rA1.elo, 'cada um vê a pontuação do outro igual à que o outro tem');
ok(rA1.friends[rB0.id].w + rA1.friends[rB0.id].l === 1 && rB1.friends[rA0.id].w === rA1.friends[rB0.id].l, 'vitórias × derrotas batem dos dois lados');
const endA = await A.textContent('.tt-overlay.end').catch(() => '');
const endB = await B.textContent('.tt-overlay.end').catch(() => '');
ok(endA.includes(`→ ${rA1.elo} pontos`) && endB.includes(`→ ${rB1.elo} pontos`), 'o fim da partida mostra a pontuação nova dos dois lados');
await A.screenshot({ path: `${OUT}/ranking-fim-anfitriao.png` });
await B.screenshot({ path: `${OUT}/ranking-fim-convidado.png` });
// o histórico grava depois de compactar o replay (assíncrono): espera ele chegar
const histB = await B.waitForFunction(() => {
  const k = Object.keys(localStorage).find((x) => x.startsWith('riftbound-mesa-historico-v1:'));
  const o = k ? JSON.parse(localStorage.getItem(k)) : null;
  return o?.list?.length ? o.list : null;
}, null, { timeout: 15000 }).then((h) => h.jsonValue(), () => []);
ok(histB.length === 1 && histB[0].opp === rA0.id && histB[0].elo?.after === rB1.elo, 'histórico do convidado com o amigo e a pontuação');

// ── 3. recarregar e ver o replay não contam de novo ──
await B.reload();
await B.waitForSelector('.tt-mat', { timeout: 15000 });
await B.waitForTimeout(2500);
await A.click('.tt-overlay.end [data-act=replaythis]');
await A.waitForTimeout(1500);
const rA2 = await rankOf(A);
const rB2 = await rankOf(B);
ok(rA2.elo === rA1.elo && rA2.log.length === 1 && rB2.elo === rB1.elo && rB2.log.length === 1, 'recarregar a página e abrir o replay não contam de novo');
// volta do replay (sai pelo botão de sair do replay, se houver) e pede a revanche
await A.reload();
await A.waitForSelector('.tt-mat', { timeout: 15000 });
await A.waitForSelector('.tt-overlay.end [data-act=rematch]', { timeout: 15000 }).catch(() => {});
// depois de recarregar, o anfitrião só tem o convidado de novo quando ele se apresentar (hello): tenta até começar
const seed0 = await A.evaluate(() => window.__rb.game.cfg.seed);
let started = false;
for (let k = 0; k < 30 && !started; k++) {
  await A.click('.tt-overlay.end [data-act=rematch]', { timeout: 2000 }).catch(() => {});
  await A.waitForTimeout(500);
  started = await A.evaluate((s) => window.__rb.game?.cfg.seed !== s, seed0);
}
const cfg2 = started ? await A.evaluate(() => window.__rb.game.cfg.rank) : null;
ok(started && cfg2?.[0].elo === rA1.elo && cfg2?.[1].elo === rB1.elo, `revanche: o cfg leva as pontuações novas dos dois (${JSON.stringify(cfg2?.map((c) => c.elo))})`);

// ── 4. telas: ranking e perfil nos três tamanhos ──
for (const [w, h, tag, mobile] of [[1920, 1080, '1920', false], [1366, 768, '1366', false], [390, 844, '390', true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`telas ${tag}: ${e.message}`));
  await page.goto(URL);
  // a conta do anfitrião (com o ranking e o histórico) neste contexto
  const dump = await A.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('riftbound-mesa-conta') || k.startsWith('riftbound-mesa-historico')).map((k) => [k, localStorage.getItem(k)])));
  await page.evaluate((d) => {
    for (const [k, v] of Object.entries(d)) localStorage.setItem(k, v);
  }, dump);
  await page.reload();
  await page.click('[data-act=ranking]');
  await page.waitForSelector('.rk-table');
  const rows = await page.$$eval('.rk-table li.rk-row', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  ok(rows.length === 2 && rows.some((r) => r.includes('Ana')) && rows.some((r) => r.includes('você')), `ranking (${tag}): você e a Ana`);
  await page.screenshot({ path: `${OUT}/ranking-${tag}.png`, fullPage: true });
  await page.click('[data-act=profile]');
  await page.waitForSelector('.pf-chart svg');
  const t = await page.textContent('.pf-tiles');
  ok(t.includes(String(rA1.elo)), `perfil (${tag}): pontuação ${rA1.elo}`);
  await page.screenshot({ path: `${OUT}/perfil-${tag}.png`, fullPage: true });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(sw <= 0, `perfil (${tag}) sem rolagem horizontal`);
  await page.click('[data-act=pfhome]');
  await page.waitForSelector('[data-act=ranking]');
  await ctx.close();
}

console.log(checks.join('\n'));
console.log(errors.length ? 'ERROS:\n' + errors.join('\n') : 'sem erros');
await browser.close();
process.exit(errors.length ? 1 : 0);
