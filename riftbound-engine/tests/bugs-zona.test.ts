// Caça de bugs de interação: objetos mudando de zona, de local ou de controle (regra 124: objeto novo; 718-719: anexos;
// troca de controle; fichas; escondidas). Cada teste reproduz um bug achado na varredura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Obj, P } from '../src/engine/types';
import type { GameEvent } from '../src/engine/engine';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const ORDER = 'OGN-214';
const FURY = 'OGN-007';
const BODY = 'OGN-126';
const MIND = 'OGN-089';
const CHAOS = 'OGN-166';
const SKULKER = 'OGN-175'; // 3 de Might, sem texto
const SERGEANT = 'OGN-219'; // 4 de Might, sem texto

/** Passa/decide até a pilha esvaziar (respostas padrão). */
function drain(s: Scenario, max = 40) {
  for (let i = 0; i < max && s.g.current; i++) {
    const d = s.d;
    if (d.kind === 'priority' || d.kind === 'focus') s.pick('Passar');
    else if (d.kind === 'action') break;
    else if (d.kind === 'confirm') s.ok([d.options[0].id]);
    else s.ok(d.options.slice(0, Math.max(d.min, 1)).map((o) => o.id));
  }
}
/** Registra os eventos emitidos a partir de agora. */
function spy(s: Scenario): GameEvent[] {
  const evs: GameEvent[] = [];
  const emit = s.e.emit.bind(s.e);
  s.e.emit = (ev) => {
    evs.push(ev);
    emit(ev);
  };
  return evs;
}

// ───────────── efeitos atrasados na cópia da IA ─────────────
// A IA testa jogadas numa cópia da partida (cloneAtRoot). Os efeitos atrasados são copiados com as funções, e as
// funções que guardavam o OBJETO da unidade agiam sobre o objeto da partida de verdade.

test('Noxian Guillotine: na cópia da IA, o dano mata a unidade da cópia — não a da partida de verdade', () => {
  const s = new Scenario();
  s.runes(0, [ORDER, ORDER, ORDER, ORDER, ORDER]);
  const foe = s.put(1, SKULKER, BF0);
  s.put(0, 'OGN-254', 'hand');
  s.go();
  s.pick('Jogar Noxian Guillotine');
  s.maybeObj(foe);
  s.passAll();
  assert.equal(s.e.delayed.length, 1);
  const sim = s.e.cloneAtRoot();
  const simFoe = sim.objs[foe.id];
  sim.dealDamage(simFoe, 1);
  sim.runSync(sim.settle());
  assert.equal(foe.zone, 'board', 'a unidade da partida de verdade continua no tabuleiro');
  assert.equal(simFoe.zone, 'trash', 'na cópia, a Guilhotina mata a unidade da cópia');
  assert.ok(sim.pl[1].trash.includes(foe.id));
  // e a partida de verdade continua funcionando: o dano de verdade mata
  s.e.dealDamage(foe, 1);
  s.e.runSync(s.e.settle());
  assert.equal(foe.zone, 'trash');
  assert.ok(s.e.pl[1].trash.includes(foe.id));
});

test('Relentless Pursuit: na cópia da IA, "quando eu conquisto, me mova para a base" move a unidade da cópia', () => {
  const s = new Scenario();
  s.runes(0, [BODY, FURY, FURY]);
  const u = s.put(0, SKULKER, base(0));
  s.put(0, SKULKER, BF1); // A já controla o campo 1: ir para lá não conquista
  s.put(0, 'SFD-184', 'hand');
  s.go();
  s.pick('Jogar Relentless Pursuit');
  s.maybeObj(u);
  if (s.d.prompt.includes('prender')) s.ok([]);
  s.pick(s.e.name(s.e.bfs[1].objId));
  drain(s);
  assert.equal(s.e.delayed.length, 1);
  const at = s.e.bfIndex(u);
  assert.equal(at, 1, s.log(10));
  const sim = s.e.cloneAtRoot();
  // na cópia, a unidade conquista outro campo e o gatilho concedido a manda para a base
  sim.emit({ type: 'conquer', player: 0, bf: at, units: [u.id] });
  sim.runSync(sim.drain());
  assert.deepEqual(sim.objs[u.id].loc, base(0), 'na cópia, a unidade foi para a base');
  assert.deepEqual(u.loc, { t: 'bf', i: at }, 'na partida de verdade, ela não se mexeu');
});

// ───────────── regra 124: objeto novo ─────────────

test('Vi, Peacekeeper: volta para a mão no meio do combate e é jogada de novo com Ambush — o objeto novo ataca (dispara de novo)', () => {
  const s = new Scenario();
  s.runes(0, [ORDER, ORDER, ORDER, ORDER, ORDER, ORDER, ORDER, ORDER, MIND]);
  const vi = s.put(0, 'UNL-176', base(0));
  const pal = s.put(0, SKULKER, base(0));
  const d1 = s.put(1, SERGEANT, BF0);
  const d2 = s.put(1, SERGEANT, BF0);
  s.put(0, 'OGN-104', 'hand'); // Retreat
  s.go();
  const evs = spy(s);
  s.pick('Mover unidades');
  s.ok([vi.id, pal.id]);
  s.pick(s.e.name(s.e.bfs[0].objId));
  // gatilho de ataque da Vi: atordoa um defensor
  for (let i = 0; i < 10 && s.d.kind !== 'focus'; i++) {
    if (s.d.prompt.includes('atordoar')) s.pickObj(d1);
    else if (s.d.kind === 'priority') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(evs.filter((e) => e.type === 'attack' && e.unit?.id === vi.id).length, 1);
  assert.ok(d1.stunned);
  // Retreat na Vi (Reaction), depois a Vi de novo, com Ambush, no mesmo combate
  assert.equal(s.d.player, 0);
  s.pick('Jogar Retreat');
  s.maybeObj(vi);
  for (let i = 0; i < 6 && !(s.d.player === 0 && s.d.kind === 'focus'); i++) s.pick('Passar');
  assert.equal(vi.zone, 'hand');
  s.pick('Jogar Vi, Peacekeeper');
  s.pick(s.e.name(s.e.bfs[0].objId));
  assert.equal(evs.filter((e) => e.type === 'attack' && e.unit?.id === vi.id).length, 2, 'a Vi nova é atacante: "quando eu ataco" dispara');
  assert.equal(s.e.log.filter((l) => l.text === 'Na pilha: Vi, Peacekeeper: Atordoar uma unidade inimiga aqui.').length, 2, s.log(12));
  void d2;
});

test('Vex, Apathetic: "não pode se mover neste turno" não fica na unidade que voltou para a mão e foi jogada de novo', () => {
  const s = new Scenario();
  s.runes(0, [CHAOS, CHAOS, CHAOS, CHAOS, CHAOS, CHAOS]);
  const vex = s.put(1, 'UNL-150', BF0);
  const u = s.put(0, SKULKER, 'hand');
  s.go();
  s.pick('Jogar Shipyard Skulker');
  if (s.d.prompt.startsWith('Jogar Shipyard')) s.pick('base de A');
  drain(s);
  assert.ok(u.stunned, 'a Vex atordoa');
  assert.equal(u.noMoveTurn, s.e.turn);
  // a Vex sai; a unidade volta para a mão e é jogada de novo: é outro objeto (regra 124.1)
  s.e.kill(vex);
  s.e.returnToHand(u);
  s.go();
  s.pick('Jogar Shipyard Skulker');
  if (s.d.prompt.startsWith('Jogar Shipyard')) s.pick('base de A');
  drain(s);
  assert.equal(u.zone, 'board');
  assert.ok(!u.stunned);
  s.e.ready(u); // algo a prepara
  assert.ok(s.e.movableUnits(0).includes(u), 'o objeto novo pode se mover');
});
