// Revisão independente do Radiance, RAD-106..RAD-126: um teste por correção.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const ORDER = 'OGN-214';
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5 (Fury)
const GEAR = 'OGN-021'; // Sun Disc (gear)

/** Passa a prioridade e ordena gatilhos simultâneos até chegar numa decisão que não é de passar (ou que casa com `until`). */
function drain(s: Scenario, until?: RegExp) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (until && until.test(s.d.prompt)) break;
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
function where(s: Scenario, label = 'base') {
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick(label);
}
function move(s: Scenario, ids: string[], to: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(ids);
  if (s.d.prompt.startsWith('Para onde')) s.pick(to);
}

// ───────────────────────────── RAD-107 Bedeviling Stranger ─────────────────────────────
test('Bedeviling Stranger: a unidade inimiga é alvo escolhido ao pôr o gatilho na pilha; o "you may" fica para a resolução', () => {
  const s = new Scenario();
  s.put(0, UNIT, BF0);
  s.put(0, UNIT, BF0);
  const foe = s.put(1, UNIT, BF0);
  s.put(1, UNIT, BF0);
  s.put(0, 'RAD-107', 'hand');
  s.runes(0, rs(RUNE.chaos, 2));
  s.go();
  s.pick('Jogar Bedeviling Stranger');
  where(s);
  drain(s, /Bedeviling Stranger: escolha um campo/);
  s.pick('Campo Vazio A');
  // 355.10/355.12: a unidade é escolhida agora, não na resolução
  assert.match(s.d.prompt, /qual unidade inimiga/, s.log());
  s.pickObj(foe);
  drain(s, /Devolver/);
  assert.match(s.d.prompt, /Devolver/, s.log());
  s.pick('Sim');
  assert.equal(foe.zone, 'hand', s.log());
});

// ───────────────────────────── RAD-108 Bushwhack Trap ─────────────────────────────
test('Bushwhack Trap: quando a trap sai, o controlador do campo descarta o excesso de cartas escondidas (107.3.b.2)', () => {
  const s = new Scenario();
  s.put(0, UNIT, BF0);
  const trap = s.put(0, 'RAD-108', BF0);
  const a = s.put(0, 'RAD-107', 'hand');
  const b = s.put(0, 'RAD-107', 'hand');
  s.runes(0, rs(RUNE.chaos, 2));
  s.go();
  s.pick('Esconder Bedeviling Stranger');
  s.pick('Esconder Bedeviling Stranger');
  assert.equal(a.zone, 'facedown', s.log());
  assert.equal(b.zone, 'facedown', s.log());
  s.e.runSync(s.e.killG(trap));
  s.e.runSync(s.e.cleanupG()); // a limpeza pergunta qual carta sai; o runSync responde com a 1ª opção
  assert.equal(s.e.bfs[0].facedown.length, 1, s.log());
  assert.equal([a, b].filter((o) => o.zone === 'trash').length, 1, s.log());
});

// ───────────────────────────── RAD-111 Mechanical Bandit ─────────────────────────────
test('Mechanical Bandit: cada jogador revela o próprio deck (o oponente é quem revela o dele)', () => {
  const s = new Scenario();
  const bandit = s.put(0, 'RAD-111', base(0));
  s.put(0, UNIT, 'deckTop');
  s.put(1, 'RAD-108', 'deckTop');
  s.go();
  s.e.emit({ type: 'beginStart', player: 0 });
  s.e.pending = s.e.pending.filter((x) => x.sourceId === bandit.id);
  s.e.runSync(s.e.placePending());
  s.e.runSync(s.e.resolveTop());
  assert.ok(s.e.log.some((l) => /B revela Bushwhack Trap/.test(l.text)), s.log(30));
});

// ───────────────────────────── RAD-112 Ziggs, Explosive ─────────────────────────────
test('Ziggs: matar o gear é custo pago ao finalizar o gatilho de defesa (355.10.c.1, 383.3.b)', () => {
  const s = new Scenario();
  const att = s.put(0, UNIT, base(0));
  const ziggs = s.put(1, 'RAD-112', BF0);
  const gear = s.put(1, GEAR, base(1));
  s.go();
  move(s, [att.id], 'Campo Vazio A');
  drain(s, /Ziggs/);
  assert.match(s.d.prompt, /Ziggs/, s.log());
  s.pick('Sim');
  s.maybeObj(gear);
  assert.equal(gear.zone, 'trash', s.log());
  // o gear morreu como custo, antes de o gatilho ir para a pilha
  const L = s.e.log.map((l) => l.text);
  const died = L.findIndex((t) => /Sun Disc/.test(t));
  const onChain = L.findIndex((t) => /Na pilha: Ziggs/.test(t));
  assert.ok(died >= 0 && onChain > died, s.log(20));
  assert.ok(L.some((t) => /Resolve: Ziggs/.test(t)), s.log(20));
  void ziggs;
});

// ───────────────────────────── RAD-113 Angler Wyrm ─────────────────────────────
test('Angler Wyrm: a habilidade pode ser ativada fora de um campo (só [Tap], sem restrição de uso)', () => {
  const s = new Scenario();
  const wyrm = s.put(0, 'RAD-113', base(0));
  s.go();
  assert.ok(s.d.options.some((o) => o.label.includes('O oponente move')), 'ativável fora de um campo: ' + s.d.options.map((o) => o.label).join(' | '));
  void wyrm;
});

// ───────────────────────────── RAD-115 Transpositionist ─────────────────────────────
test('Transpositionist: "ignoring its cost" zera só o custo base — o custo adicional obrigatório continua (356.1.b.1)', () => {
  const s = new Scenario();
  s.put(0, 'RAD-115', base(0));
  const big = s.put(0, UNIT, base(0)); // 5 de Might
  const gear = s.put(0, GEAR, base(0));
  const four = s.put(0, 'SFD-044', 'hand'); // 4 de Might; custo adicional: devolver um gear aliado para a mão
  s.runes(0, [RUNE.chaos]);
  s.go();
  s.pick('Devolver uma unidade aliada');
  s.maybeObj(big);
  drain(s, /Jogar uma unidade com menos Might/);
  s.pick('Sim');
  s.maybeObj(four);
  for (let i = 0; i < 6 && s.g.current && s.d.kind !== 'priority' && s.d.kind !== 'action'; i++) {
    if (s.d.options.some((o) => o.obj === gear.id)) s.pickObj(gear);
    else if (s.d.prompt.includes('onde?')) s.pick('base');
    else break;
  }
  drain(s);
  assert.equal(four.zone, 'board', s.log());
  assert.equal(gear.zone, 'hand', 'o custo adicional foi pago: ' + s.log());
});

// ───────────────────────────── RAD-120 Meticulous Restorationist ─────────────────────────────
test('Meticulous Restorationist: o "you may" é decidido ao finalizar o gatilho; o [Order] é pago na resolução', () => {
  const s = new Scenario();
  const mr = s.put(0, 'RAD-120', 'trash');
  s.put(0, 'RAD-113', 'hand'); // Angler Wyrm, custo 8
  s.runes(0, [...rs(RUNE.chaos, 8), ORDER]);
  s.go();
  s.pick('Jogar Angler Wyrm');
  where(s);
  drain(s, /Meticulous Restorationist/);
  assert.match(s.d.prompt, /Meticulous Restorationist.*\?/, s.log());
  assert.equal(s.d.player, 0);
  s.pick('Sim');
  drain(s);
  where(s);
  drain(s);
  assert.equal(mr.zone, 'board', s.log());
});

// ───────────────────────────── RAD-124 Burn Away ─────────────────────────────
test('Burn Away: o Burn 2 acontece mesmo se o alvo ficou ilegal (359.3.e)', () => {
  const s = new Scenario();
  s.put(0, 'RAD-124', 'hand');
  const g = s.put(1, GEAR, base(1));
  s.runes(0, [...rs(ORDER, 4)]);
  for (let k = 0; k < 3; k++) s.put(0, UNIT, 'deckTop');
  s.go();
  const trash0 = s.e.pl[0].trash.length;
  s.pick('Jogar Burn Away');
  s.maybeObj(g);
  // o alvo sai antes da resolução
  s.e.toZone(g, 'hand');
  drain(s);
  assert.equal(s.e.pl[0].trash.length, trash0 + 2 + 1, 'Burn 2 + o próprio spell: ' + s.log());
});

// ───────────────────────────── RAD-126 Mournful Spirit ─────────────────────────────
test('Mournful Spirit: alvo escolhido ao pôr o Deathknell na pilha (Deflect cobrado), só no local onde morreu', () => {
  const s = new Scenario();
  const ms = s.put(0, 'RAD-126', base(0));
  const here = s.put(1, UNIT, BF0);
  const there = s.put(1, UNIT, BF1);
  s.go();
  move(s, [ms.id], 'Campo Vazio A');
  drain(s, /Mournful Spirit/);
  assert.match(s.d.prompt, /Mournful Spirit.*\?/, s.log());
  s.pick('Sim');
  assert.ok(!s.d.options.some((o) => o.obj === there.id), 'só unidades/gear do local');
  s.maybeObj(here);
  drain(s);
  assert.equal(here.zone, 'trash', s.log());
});
