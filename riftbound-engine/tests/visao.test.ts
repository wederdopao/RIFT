// Visão filtrada do online (src/engine/view.ts): o convidado/espectador recebe só o que pode ver.
// - nenhum código nem id de carta escondida do oponente (mão, deck, viradas) aparece na visão;
// - o que a pergunta mostra a quem decide (topo do deck, mão revelada) aparece só para ele;
// - a visão montada por diferenças é igual à visão completa; o motor de leitura do convidado funciona.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../src/cards';
import { Game } from '../src/engine/game';
import { DECKS } from '../src/decks/origins';
import { HIDDEN_CODE, ViewGame, ViewKeeper, hiddenFrom, type Viewer } from '../src/engine/view';
import { quickPick } from '../src/ai/ai';
import type { P } from '../src/engine/types';
import { Rng } from '../src/engine/rng';
import { Scenario } from './harness';

const sizes = { diff: 0, n: 0, full: 0 };
type Keepers = Map<Viewer, { k: ViewKeeper; vg: ViewGame | null }>;

function source(g: Game, owners: P[], viewer: Viewer) {
  const lr = g.lastRoot;
  return {
    engine: g.engine,
    current: g.current,
    answers: g.answers,
    lastRoot: lr,
    canCancel: g.canCancel,
    rootMine: lr !== null && owners.slice(lr).every((o) => o === viewer),
    final: g.engine.winner !== null ? g.serialize() : undefined,
  };
}

/** Confere uma visão contra a partida de verdade. Devolve quantas cartas a pergunta mostrou a quem decide. */
const everSeen = new Map<Viewer, Set<string>>();
function check(g: Game, viewer: Viewer, vg: ViewGame, where: string): number {
  const eng = g.engine;
  const v = vg.state;
  const json = JSON.stringify({ ...v, fin: undefined, log: undefined });
  const logJson = JSON.stringify(v.log);
  const seenBefore = everSeen.get(viewer) || new Set<string>();
  everSeen.set(viewer, seenBefore);
  const d = g.current;
  const shown = new Set(d && d.player === viewer ? d.options.filter((o) => o.obj && eng.objs[o.obj] && eng.objs[o.obj].zone !== 'facedown').map((o) => o.obj!) : []);
  let revealed = 0;
  // códigos que quem olha pode ver: contagem por código
  const can = new Map<string, number>();
  for (const o of Object.values(eng.objs)) {
    const hid = hiddenFrom(eng, o, viewer) && !shown.has(o.id);
    if (!hid) can.set(o.code, (can.get(o.code) || 0) + 1);
    if (hid) {
      // id de verdade de carta escondida não aparece em lugar nenhum
      const at = json.indexOf(`"${o.id}"`);
      assert.ok(at < 0, `${where}: id escondido ${o.id} (${o.zone}) vazou para ${viewer}: ...${json.slice(Math.max(0, at - 300), at + 40)}`);
      // no registro só pode aparecer o id de uma carta que quem olha já viu (linha de quando ela era pública)
      if (!seenBefore.has(o.id)) assert.ok(!logJson.includes(`"${o.id}"`), `${where}: id escondido ${o.id} no registro de ${viewer}`);
      assert.ok(!v.o[o.id], `${where}: objeto escondido ${o.id} na visão`);
    } else if (hiddenFrom(eng, o, viewer)) {
      revealed++;
      assert.equal(v.o[o.id]?.code, o.code, `${where}: carta mostrada pela pergunta aparece para quem decide`);
    } else assert.equal(v.o[o.id]?.code, o.code, `${where}: objeto visível ${o.id} na visão`);
  }
  for (const o of Object.values(eng.objs)) if (v.o[o.id]) seenBefore.add(o.id);
  const seen = new Map<string, number>();
  for (const o of Object.values(v.o)) if (o.code !== HIDDEN_CODE) seen.set(o.code, (seen.get(o.code) || 0) + 1);
  for (const [code, n] of seen) assert.ok(n <= (can.get(code) || 0), `${where}: ${code} aparece ${n}x para ${viewer} (pode ${can.get(code) || 0})`);
  // contagens públicas batem
  for (const p of [0, 1] as P[]) {
    assert.equal(vg.engine.pl[p].hand.length, eng.pl[p].hand.length);
    assert.equal(vg.engine.pl[p].mainDeck.length, eng.pl[p].mainDeck.length);
    for (const id of vg.engine.pl[p].hand) assert.ok(vg.engine.objs[id], `${where}: mão aponta para objeto da visão`);
  }
  assert.equal(v.e.cfg.seed, 0);
  assert.ok(!('rng' in v.e) && !('pending' in v.e) && !('delayed' in v.e));
  for (const p of [0, 1] as P[]) if (p !== viewer) assert.equal(v.e.cfg.decks[p].main.length, 0, 'lista do deck do oponente não vai');
  // pergunta: só quem decide vê as opções
  if (d && d.player !== viewer) assert.equal(v.d!.options.length, 0);
  if (d && d.player === viewer) assert.equal(v.d!.options.length, d.options.length);
  // o motor de leitura do convidado responde o que a mesa pergunta
  const ve = vg.engine;
  for (const u of ve.units()) {
    ve.might(u);
    ve.kw(u);
  }
  if (viewer !== -1) {
    for (const id of ve.pl[viewer].hand) ve.energyDiscount(ve.objs[id], viewer);
    if (d?.root && d.player === viewer) {
      ve.movableUnits(viewer);
      for (const id of ve.pl[viewer].hand) ve.playBlockReason(viewer, ve.objs[id], 'hand', d.kind === 'action' ? 'main' : 'priority');
    }
  }
  ve.runesOf(0);
  ve.legendOf(1);
  for (let i = 0; i < ve.bfs.length; i++) ve.unitsAtBf(i, 0);
  return revealed;
}

function play(seed: number, decks: [any, any], steps: number, bfMode: 'random' | 'choose' = 'random') {
  const g = new Game({ seed, decks, names: ['Anfitrião', 'Convidado'], battlefieldMode: bfMode });
  const owners: P[] = [];
  const ks: Keepers = new Map([0, 1, -1].map((v) => [v as Viewer, { k: new ViewKeeper(v as Viewer), vg: null }]));
  const rng = new Rng(seed * 7 + 1);
  let revealed = 0;
  let undos = 0;
  for (let i = 0; i < steps && g.current; i++) {
    for (const [viewer, x] of ks) {
      const src = source(g, owners, viewer);
      // às vezes a visão completa (reconexão), no resto só a diferença
      if (!x.vg || rng.int(9) === 0) {
        const f = x.k.full(src);
        sizes.full = Math.max(sizes.full, JSON.stringify(f).length);
        x.vg = new ViewGame(f);
      }
      else {
        const df = x.k.diff(src)!;
        sizes.diff += JSON.stringify(df).length;
        sizes.n++;
        // passa pelo "fio" (JSON) como no online
        const ok = x.vg.apply(JSON.parse(JSON.stringify(df)));
        if (!ok) x.vg = new ViewGame(x.k.full(src));
      }
      revealed += check(g, viewer, x.vg, `seed ${seed} passo ${i}`);
      // a visão montada por diferenças é a mesma que a completa
      const full = new ViewKeeper(viewer);
      (full as any).alias = new Map((x.k as any).alias);
      (full as any).memo = [...(x.k as any).memo];
      const st = x.vg.state;
      const ref = full.build(src);
      assert.deepEqual(JSON.parse(JSON.stringify(st.o)), JSON.parse(JSON.stringify(ref.o)), `seed ${seed} passo ${i}: objetos por diferença = completa`);
      assert.deepEqual(JSON.parse(JSON.stringify(st.e)), JSON.parse(JSON.stringify(ref.e)), `seed ${seed} passo ${i}: motor por diferença = completo`);
      assert.deepEqual(st.log, ref.log.slice(st.logOff), `seed ${seed} passo ${i}: registro`);
    }
    const d = g.current;
    if (i > 20 && rng.int(25) === 0 && g.lastRoot !== null) {
      g.undo();
      owners.length = g.answers.length;
      undos++;
      continue;
    }
    // respostas variadas: às vezes a "boa", às vezes aleatória
    let ans: string[];
    if (rng.int(3) === 0) ans = quickPick(d, g.engine);
    else {
      const k = d.min + rng.int(Math.min(d.max, d.options.length) - d.min + 1);
      const ids = d.options.map((o) => o.id);
      ans = [];
      while (ans.length < k) {
        const id = ids.splice(rng.int(ids.length), 1)[0];
        if (id === undefined) break;
        ans.push(id);
      }
    }
    const who = d.player;
    if (!g.answer(ans)) g.answer(quickPick(g.current!, g.engine)) || g.answer([g.current!.options[0].id]);
    owners.length = Math.min(owners.length, g.answers.length);
    for (let k = owners.length; k < g.answers.length; k++) owners[k] = who;
  }
  return { g, revealed, undos };
}

test('visão filtrada: nada escondido vaza, diferenças = visão completa, motor de leitura funciona', () => {
  everSeen.clear();
  let revealed = 0;
  let undos = 0;
  // deck que olha o topo (Vision, Stacked Deck, The Candlelit Sanctum): exercita "a pergunta mostra a quem decide"
  const LOOK = {
    ...DECKS[0],
    name: 'Jinx que olha o topo',
    main: DECKS[0].main.map(([c, n]) => (c === 'OGN-169' ? ['OGN-171', n] : c === 'OGN-168' ? ['OGN-183', n] : c === 'OGN-182' ? ['OGN-171', n] : [c, n])) as [string, number][],
    battlefields: ['OGN-291'],
  };
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    everSeen.clear();
    const decks: [any, any] = seed > 4 ? [LOOK, LOOK] : [DECKS[seed % 2], DECKS[(seed + 1) % 2]];
    const r = play(seed, decks, 260);
    revealed += r.revealed;
    undos += r.undos;
  }
  assert.ok(undos > 0, 'desfazer exercitado');
  assert.ok(revealed > 0, 'perguntas que mostram cartas escondidas exercitadas');
  console.log(`tamanho: diferença média ${Math.round(sizes.diff / sizes.n)} bytes, visão completa até ${sizes.full} bytes`);
  console.log('cartas mostradas a quem decide (Predict/olhar/revelar):', revealed, '| desfazer:', undos);
});

test('visão filtrada: escolha de campos esconde o campo de quem já escolheu', () => {
  const g = new Game({ seed: 9, decks: [DECKS[0], DECKS[1]], battlefieldMode: 'choose' });
  assert.equal(g.current!.kind, 'setup');
  g.answer([g.current!.options[0].id]);
  assert.equal(g.current!.kind, 'setup');
  assert.equal(g.current!.player, 1);
  const k = new ViewKeeper(1);
  const v = k.full({ engine: g.engine, current: g.current, answers: g.answers, lastRoot: g.lastRoot, canCancel: false });
  const bf0 = g.engine.objs[g.engine.bfs[0].objId];
  assert.ok(!JSON.stringify(v).includes(`"${bf0.code}"`), 'campo do anfitrião escondido enquanto o convidado escolhe');
  assert.equal(v.d!.options.length, g.current!.options.length);
  g.answer([g.current!.options[0].id]);
  const v2 = new ViewGame(k.full({ engine: g.engine, current: g.current, answers: g.answers, lastRoot: g.lastRoot, canCancel: false }));
  assert.equal(v2.engine.objs[g.engine.bfs[0].objId]?.code, bf0.code, 'depois dos dois escolherem, aparece');
});

test('visão filtrada: registro privado, viradas, olhar o próprio topo e apelidos nas respostas', () => {
  const s = new Scenario(3);
  const e = s.e;
  // carta virada do jogador 0 num campo
  const fd = s.put(0, 'OGN-052', 'hand');
  e.pl[0].hand = e.pl[0].hand.filter((id) => id !== fd.id);
  fd.zone = 'facedown';
  fd.loc = { t: 'bf', i: 0 };
  fd.controller = 0;
  e.bfs[0].facedown.push(fd.id);
  e.sayTo([0, 1], `B olha a carta escondida: ${e.name(fd)}.`, 'B olha a carta escondida.', 1);
  const src = (v: Viewer) => ({ engine: e, current: s.g.current, answers: s.g.answers, lastRoot: s.g.lastRoot, canCancel: false });
  const vB = new ViewKeeper(1).full(src(1));
  const vW = new ViewKeeper(-1).full(src(-1));
  assert.ok(!JSON.stringify(vB.o).includes('OGN-052') || Object.values(vB.o).some((o) => o.code === 'OGN-052' && o.zone !== 'facedown'), 'virada do oponente sem código');
  assert.equal(vB.log[vB.log.length - 1].text, `B olha a carta escondida: ${e.name(fd)}.`, 'quem olhou lê o nome');
  assert.equal(vW.log[vW.log.length - 1].text, 'B olha a carta escondida.', 'espectador lê só o texto público');
  assert.ok(!JSON.stringify(vW.log).includes(e.name(fd)));
  // com a permissão de olhar (Scuttle Crab), o oponente vê a virada
  e.addEffect({ player: 1, flag: 'seeFacedown', until: 'turn' });
  const vB2 = new ViewKeeper(1).full(src(1));
  assert.equal(vB2.o[fd.id]?.code, 'OGN-052', 'seeFacedown mostra a virada');
  const vW2 = new ViewKeeper(-1).full(src(-1));
  assert.ok(!vW2.o[fd.id], 'espectador continua sem ver');
  // pergunta que mostra o topo do próprio deck (como Predict): só quem decide vê; resposta com o id volta certa
  const top = e.objs[e.pl[1].mainDeck[0]];
  const fake = { player: 1 as P, kind: 'choose' as const, prompt: 'Predict', options: [{ id: top.id, label: e.name(top), obj: top.id }], min: 0, max: 1 };
  const kB = new ViewKeeper(1);
  const vTop = kB.full({ engine: e, current: fake, answers: [], lastRoot: null, canCancel: false });
  assert.equal(vTop.o[top.id]?.code, top.code, 'o dono vê a carta do topo');
  assert.equal(vTop.e.pl[1].mainDeck[0], top.id);
  const vTopA = new ViewKeeper(0).full({ engine: e, current: fake, answers: [], lastRoot: null, canCancel: false });
  assert.ok(!vTopA.o[top.id] && !JSON.stringify(vTopA).includes(`"${top.id}"`), 'o oponente não vê o topo do outro');
  assert.equal(vTopA.d!.options.length, 0);
  // pergunta com alvo numa virada do oponente: vai com apelido e sem o nome; a resposta volta ao id de verdade
  const fake2 = { player: 1 as P, kind: 'choose' as const, prompt: 'Alvo', options: [{ id: fd.id, label: `Matar ${e.name(fd)}`, obj: fd.id }], min: 1, max: 1 };
  e.effects = e.effects.filter((x) => x.flag !== 'seeFacedown');
  const k2 = new ViewKeeper(1);
  const v3 = k2.full({ engine: e, current: fake2, answers: [], lastRoot: null, canCancel: false });
  const opt = v3.d!.options[0];
  assert.notEqual(opt.id, fd.id);
  assert.ok(!opt.label.includes(e.name(fd)) && opt.label.includes('carta escondida'));
  assert.deepEqual(k2.unalias([opt.id]), [fd.id]);
});
