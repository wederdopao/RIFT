// Rodada 2 do Vendetta/Radiance, frente "cartas individuais": um teste por correção.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const MIND = 'OGN-089';
const ORDER = 'OGN-214';
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5 (Fury)

/** Passa a prioridade e ordena gatilhos simultâneos até chegar numa decisão que não é de passar. */
function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
/** Escolhe o local ao jogar uma unidade, se for perguntado. */
function where(s: Scenario, label = 'base') {
  if (s.d.prompt.includes('onde?')) s.pick(label);
}

// ───────────────────────────── RAD-102 Demon Shade ─────────────────────────────
test('Demon Shade: o jogador escolhe o modo e o destino ao jogar', () => {
  const s = new Scenario();
  const u = s.put(0, UNIT, base(0));
  s.put(0, 'RAD-102', 'hand');
  s.runes(0, rs(RUNE.chaos, 3));
  s.go();
  s.pick('Jogar Demon Shade'); // único alvo: escolhido sozinho
  assert.match(s.d.prompt, /escolha um/, s.log());
  assert.ok(s.d.options.some((o) => o.label.includes('Mover')));
  assert.ok(s.d.options.some((o) => o.label.includes('Ganking')));
  s.pick('Mover');
  assert.match(s.d.prompt, /qual campo aberto/, s.log());
  s.ok([s.d.options[1].id]);
  drain(s);
  assert.deepEqual(u.loc, BF1, s.log());
  assert.ok(!s.e.kw(u).ganking);
});

test('Demon Shade: sem campo aberto, o único modo é dar Ganking (só por este turno)', () => {
  const s = new Scenario();
  const u = s.put(0, UNIT, base(0));
  s.put(1, UNIT, BF0);
  s.put(1, UNIT, BF1);
  s.put(0, 'RAD-102', 'hand');
  s.runes(0, rs(RUNE.chaos, 3));
  s.go();
  s.pick('Jogar Demon Shade');
  drain(s);
  assert.ok(s.e.kw(u).ganking, s.log());
  assert.deepEqual(u.loc, base(0));
});

// ───────────────────────────── RAD-089 Titanic Shrine ─────────────────────────────
test('Titanic Shrine: pergunta; recusando, não exaure nem compra', () => {
  const s = new Scenario();
  const shrine = s.put(0, 'RAD-089', base(0));
  s.put(0, 'RAD-054', 'hand'); // Trinket Peddler 3/3
  s.put(0, 'RAD-054', 'deckTop');
  s.runes(0, rs(MIND, 6));
  s.go();
  const hand0 = s.e.pl[0].hand.length;
  s.pick('Jogar Trinket Peddler');
  where(s);
  drain(s);
  assert.match(s.d.prompt, /Titanic Shrine/, s.log());
  s.pick('Não');
  drain(s);
  assert.equal(shrine.exhausted, false);
  assert.equal(s.e.pl[0].hand.length, hand0 - 1);
});

test('Titanic Shrine: aceitando, exaure e compra 1; exaurida, não pergunta mais', () => {
  const s = new Scenario();
  const shrine = s.put(0, 'RAD-089', base(0));
  s.put(0, 'RAD-054', 'hand');
  s.put(0, 'RAD-054', 'deckTop');
  s.runes(0, rs(MIND, 6));
  s.go();
  const hand0 = s.e.pl[0].hand.length;
  s.pick('Jogar Trinket Peddler');
  where(s);
  drain(s);
  s.pick('Sim');
  drain(s);
  assert.equal(shrine.exhausted, true, s.log());
  assert.equal(s.e.pl[0].hand.length, hand0, 'jogou 1 e comprou 1');
  s.put(0, 'VEN-118', 'hand'); // Horns of the Dragon 6/6: maior que todas, mas o Shrine está exaurido
  s.runes(0, rs(MIND, 6));
  s.go();
  s.pick('Jogar Horns of the Dragon');
  where(s);
  drain(s);
  assert.doesNotMatch(s.d.prompt, /Titanic Shrine/, s.log());
});

// ───────────────────────────── RAD-070 Hold 'Em ─────────────────────────────
test("Hold 'Em: rastreia exatamente o que foi jogado a um campo neste turno (ficha conta, mesmo que já tenha saído)", () => {
  const s = new Scenario();
  const hold = s.put(0, 'RAD-070', 'hand');
  const g = s.e;
  const cost = (p: P) => g.script(hold).selfCostMod!(g, hold, p);
  assert.equal(cost(0), 0);
  g.createToken('TOK-RECRUIT', 0, base(0)); // jogada para a base não conta
  assert.equal(cost(0), 0);
  const tok = g.createToken('TOK-RECRUIT', 0, BF0);
  g.toZone(tok, 'trash'); // já saiu: continua valendo
  assert.equal(g.playedToBfThisTurn(0), true);
  assert.equal(cost(0), -2);
  assert.equal(cost(1), 0, 'o oponente não ganha o desconto');
});

test("Hold 'Em: de fato custa [1] depois de jogar uma unidade a um campo", () => {
  const s = new Scenario();
  s.put(0, 'RAD-070', 'hand');
  s.put(0, 'RAD-054', 'hand');
  s.put(0, UNIT, BF0); // controla o campo A
  s.runes(0, rs(MIND, 4));
  s.go();
  s.pick('Jogar Trinket Peddler'); // 3 de energia
  s.pick('Campo Vazio A');
  drain(s);
  // sobra 1 runa pronta: Hold 'Em custa 3 - 2 = 1
  assert.equal(s.e.runesOf(0).filter((r) => !r.exhausted).length, 1, s.log());
  s.go();
  assert.ok(s.d.options.some((o) => o.label.includes("Jogar Hold 'Em")), s.d.options.map((o) => o.label).join('|'));
});

// ───────────────────────────── RAD-051 Parallel Convergence ─────────────────────────────
test('Parallel Convergence: a unidade devolvida não pode ser o alvo (e o spell não falha)', () => {
  const s = new Scenario();
  const mine = s.put(0, UNIT, BF0);
  const mine2 = s.put(0, UNIT, base(0));
  const foe = s.put(1, UNIT, BF1);
  s.put(0, 'RAD-051', 'hand');
  s.runes(0, rs(MIND, 3));
  s.go();
  s.pick('Jogar Parallel Convergence');
  const ids = s.d.options.map((o) => o.obj);
  assert.ok(ids.includes(mine.id) && ids.includes(foe.id), s.d.prompt);
  s.pickObj(mine); // o custo (devolver uma unidade) só tem uma opção legal: a outra, nunca o alvo
  drain(s);
  assert.equal(mine2.zone, 'hand');
  assert.ok(mine.zone !== 'board' || mine.damage >= 5, 'o alvo levou 5: ' + s.log());
});

test('Parallel Convergence: com uma só unidade aliada, ela não é alvo; o inimigo é', () => {
  const s = new Scenario();
  const mine = s.put(0, UNIT, BF0);
  const foe = s.put(1, 'VEN-117', BF1); // Disciple of Shen 1/1
  s.put(0, 'RAD-051', 'hand');
  s.runes(0, rs(MIND, 3));
  s.go();
  s.pick('Jogar Parallel Convergence'); // único alvo possível (o inimigo): escolhido sozinho
  drain(s);
  assert.equal(mine.zone, 'hand', s.log());
  assert.notEqual(foe.zone, 'board', s.log());
});

// ───────────────────────────── VEN-107 Decree of Discord ─────────────────────────────
test('Decree of Discord: alvos escolhidos ao jogar, Might total 5 ou menos (só Order inimigas)', () => {
  const s = new Scenario();
  const a = s.put(1, 'VEN-123', BF0); // Soulspinner 3
  const b = s.put(1, 'VEN-121', BF1); // Reluctant Leader 3
  const c = s.put(1, 'VEN-117', base(1)); // Disciple of Shen 1
  const x = s.put(1, 'VEN-118', base(1)); // Horns of the Dragon 6 (grande demais)
  const fury = s.put(1, 'VEN-020', base(1)); // Fury, não Order
  s.put(0, 'VEN-107', 'hand');
  s.runes(0, [RUNE.chaos, RUNE.chaos]);
  s.go();
  s.pick('Jogar Decree of Discord');
  const offered = () => s.d.options.map((o) => o.obj);
  assert.ok(offered().includes(a.id) && offered().includes(b.id) && offered().includes(c.id));
  assert.ok(!offered().includes(x.id) && !offered().includes(fury.id), 'Might 6 e não-Order ficam fora');
  s.pickObj(a); // 3 de 5
  assert.ok(!offered().includes(b.id), 'Leader (3) não cabe mais: 3+3 > 5');
  assert.ok(offered().includes(c.id), 'Disciple (1) cabe: 3+1 <= 5');
  s.pickObj(c);
  drain(s);
  assert.equal(a.zone, 'hand', s.log());
  assert.equal(c.zone, 'hand');
  assert.equal(b.zone, 'board');
});

// ───────────────────────────── VEN-103 Shadows of the Past ─────────────────────────────
test('Shadows of the Past: até 2 unidades de descartes voltam à mão dos donos (alvos ao jogar)', () => {
  const s = new Scenario();
  const mine = s.put(0, UNIT, 'trash');
  const theirs = s.put(1, UNIT, 'trash');
  const third = s.put(1, UNIT, 'trash');
  const gear = s.put(0, 'OGN-021', 'trash');
  s.put(0, 'VEN-103', 'hand');
  s.runes(0, [RUNE.chaos, RUNE.chaos, RUNE.chaos, RUNE.chaos]);
  s.go();
  s.pick('Jogar Shadows of the Past');
  assert.ok(!s.d.options.some((o) => o.obj === gear.id), 'só unidades');
  s.ok([mine.id, theirs.id]);
  drain(s);
  assert.equal(mine.zone, 'hand');
  assert.equal(theirs.zone, 'hand');
  assert.ok(s.e.pl[1].hand.includes(theirs.id), 'volta à mão do dono');
  assert.equal(third.zone, 'trash');
});

// ───────────────────────────── VEN-125 Hungry Wolf ─────────────────────────────
test('Hungry Wolf: só depois de escolher uma unidade INIMIGA neste turno, e uma vez por turno', () => {
  const s = new Scenario();
  const wolf = s.put(0, 'VEN-125', BF0);
  wolf.exhausted = true;
  const foe = s.put(1, UNIT, BF1);
  const gearFoe = s.put(1, 'OGN-021', base(1));
  s.put(0, 'VEN-081', 'hand'); // Onslaught: +6 Might a uma unidade (4 de energia)
  s.put(0, 'VEN-081', 'hand');
  s.runes(0, rs(MIND, 8));
  s.runes(0, rs(ORDER, 3));
  s.go();
  const hasWolf = () => s.d.options.some((o) => o.label.includes('Preparar-me'));
  assert.equal(hasWolf(), false, 'ainda não escolheu nada');
  // escolher a própria unidade (aliada) com um spell não conta
  s.pick('Jogar Onslaught');
  s.pickObj(wolf);
  drain(s);
  assert.equal(hasWolf(), false, 'escolher unidade aliada não conta');
  // escolher um gear inimigo também não (a condição é "unidade inimiga")
  s.e.noteChoice(s.e.ctx(wolf, 0), [[gearFoe.id]]);
  s.go();
  assert.equal(hasWolf(), false, 'gear inimigo não conta');
  s.pick('Jogar Onslaught');
  s.pickObj(foe);
  drain(s);
  assert.equal(hasWolf(), true, s.log());
  s.pick('Preparar-me');
  drain(s);
  assert.equal(wolf.exhausted, false, 'preparou');
  assert.equal(hasWolf(), false, 'uma vez por turno');
});

// ───────────────────────────── VEN-024 Affectionate Poro ─────────────────────────────
test('Affectionate Poro: só compra se não recebeu dano neste turno (mesmo com a cura do fim do combate)', () => {
  const s = new Scenario();
  const poro = s.put(0, 'VEN-024', BF0);
  const ally = s.put(0, 'VEN-024', BF0);
  s.put(0, UNIT, 'deckTop');
  s.put(0, UNIT, 'deckTop');
  assert.notEqual(poro.damagedTurn, s.e.turn);
  s.e.dealDamage(poro, 1, ally);
  assert.equal(poro.damagedTurn, s.e.turn);
  poro.damage = 0; // cura que acontece ao fim do combate
  const hand0 = s.e.pl[0].hand.length;
  s.e.emit({ type: 'combatEnd', bf: 0, units: [poro.id, ally.id] });
  s.e.runSync?.(s.e.drain?.() as any);
  drain(s);
  // só a que não foi ferida compra
  assert.equal(s.e.pl[0].hand.length, hand0 + 1, s.log());
});

// ───────────────────────────── VEN-082 Profiteer ─────────────────────────────
test('Profiteer: desempodera algo seu para empoderar unidade de qualquer controlador', () => {
  const s = new Scenario();
  const mine = s.put(0, 'VEN-014', BF0); // Shadow Fiend
  mine.empowered = true;
  const foe = s.put(1, 'VEN-014', BF1);
  s.put(0, 'VEN-082', 'hand');
  s.runes(0, rs(RUNE.body, 4));
  s.go();
  s.pick('Jogar Profiteer');
  where(s);
  drain(s);
  assert.match(s.d.prompt, /Profiteer/, s.log());
  s.pick('Sim');
  drain(s);
  assert.match(s.d.prompt, /empower qual/, s.log());
  s.pickObj(foe);
  drain(s);
  assert.equal(mine.empowered, false);
  assert.equal(foe.empowered, true, 'o alvo do empower pode ser inimigo');
});

// ───────────────────────────── VEN-061 Decree of Insight ─────────────────────────────
test('Decree of Insight: ignora o Deflect do alvo ao pagar', () => {
  const s = new Scenario();
  const body = s.put(1, 'VEN-070', BF0); // Brutal Hunter (Body)
  s.e.giveKw(body, { deflect: 2 });
  s.put(0, 'VEN-061', 'hand');
  s.runes(0, [MIND]); // 1 energia; sem power para pagar Deflect 2
  s.go();
  s.pick('Jogar Decree of Insight');
  drain(s);
  assert.equal(s.e.might(body), 4 - 5, s.log());
});
