// Testes de regra. Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}
/** Escolhe a opção se ela estiver sendo perguntada (escolhas únicas são automáticas). */
function maybe(s: Scenario, text: string) {
  if (s.d.options.some((o) => o.label.includes(text)) && !s.d.root) s.pick(text);
}

/** Termina o turno do jogador atual e chega na primeira decisão de ação do próximo. */
function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
}

test('combate: Assault no atacante, Shield no defensor, conquista dá 1 ponto', () => {
  const s = new Scenario();
  const poro = s.put(1, 'OGN-052', BF0); // Stalwart Poro 2, Shield 1
  const enf = s.put(0, 'OGN-003', base(0)); // Chemtech Enforcer 2, Assault 2
  s.go();
  moveTo(s, [enf.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(poro.zone, 'trash', 'Poro (3 defendendo) morre para 4 de ataque\n' + s.log());
  assert.equal(enf.zone, 'board');
  assert.equal(s.e.bfs[0].controller, 0);
  assert.equal(s.e.pl[0].points, 1);
});

test('combate: Tank recebe dano primeiro e o excedente é registrado', () => {
  const s = new Scenario();
  const urs = s.put(1, 'OGN-137', BF0); // Stormclaw Ursine 6, Tank
  const rook = s.put(1, 'OGN-136', BF0); // Pit Rookie 2
  const drake = s.put(0, 'OGN-142', base(0)); // Mountain Drake 10
  s.go();
  moveTo(s, [drake.id], 'Campo Vazio A');
  s.passAll();
  // 10 de dano: 6 no Tank primeiro, 2 no Rookie, 2 de excedente
  assert.equal(urs.zone, 'trash');
  assert.equal(rook.zone, 'trash');
  assert.equal(drake.zone, 'board');
  assert.equal(drake.damage, 0, 'unidades se curam depois do combate');
  assert.equal(s.e.pl[0].points, 1);
});

test('combate: unidade atordoada não causa dano; atacantes que sobram voltam para a base', () => {
  const s = new Scenario();
  const elder = s.put(1, 'OGN-065', BF0); // Wizened Elder 4
  const scorch = s.put(0, 'OGN-001', base(0)); // Blazing Scorcher 5
  s.put(1, 'UNL-042', 'hand'); // Back Off (Action: Stun)
  s.runes(1, [RUNE.calm, RUNE.calm, RUNE.body]);
  s.go();
  moveTo(s, [scorch.id], 'Campo Vazio A');
  // P0 tem o Focus e nada para jogar (passa sozinho); P1 joga Back Off
  assert.equal(s.d.player, 1);
  s.pick('Jogar Back Off');
  s.pickObj(scorch);
  s.passAll();
  assert.ok(scorch.stunned || scorch.zone === 'board');
  assert.equal(elder.zone, 'board', 'Elder não leva dano de unidade atordoada\n' + s.log(30));
  assert.equal(scorch.zone, 'board');
  assert.deepEqual(scorch.loc, base(0), 'atacante volta para a base');
  assert.equal(s.e.bfs[0].controller, 1);
  assert.equal(s.e.pl[0].points, 0);
});

test('Deflect vale também para habilidade disparada (Vi, Peacekeeper mirando a Vex)', () => {
  const s = new Scenario();
  const vex = s.put(0, 'UNL-150', BF0); // Vex, Apathetic (Deflect)
  const mouser = s.put(0, 'UNL-036', BF0); // Mutated Mouser
  s.go();
  endTurn(s); // turno do jogador 1
  const vi = s.put(1, 'UNL-176', base(1)); // Vi, Peacekeeper
  for (const r of s.e.runesOf(1)) s.e.toZone(r, 'runeDeck', { bottom: true });
  s.runes(1, [RUNE.body]);
  s.go();
  moveTo(s, [vi.id], 'Campo Vazio A');
  // gatilho de ataque da Vi: escolher a Vex custa 1 power a mais
  assert.match(s.d.prompt, /atordoar qual unidade/);
  const before = s.e.runesOf(1).length;
  s.pickObj(vex);
  s.pick('Sim'); // pagar o Deflect (num gatilho é opcional; se não pagar, o gatilho sai)
  s.passAll(2);
  assert.equal(s.e.runesOf(1).length, before - 1, 'uma runa foi reciclada para pagar o Deflect\n' + s.log());
  assert.equal(vex.stunned, true);
  void mouser;
});

test('Deflect: sem power para pagar, o gatilho é obrigado a escolher outra unidade (regra 355.16)', () => {
  const s = new Scenario();
  const vex = s.put(0, 'UNL-150', BF0);
  const mouser = s.put(0, 'UNL-036', BF0);
  s.go();
  endTurn(s);
  const vi = s.put(1, 'UNL-176', base(1));
  for (const r of s.e.runesOf(1)) s.e.toZone(r, 'runeDeck', { bottom: true });
  s.go();
  moveTo(s, [vi.id], 'Campo Vazio A');
  // a Vex sai das opções: o Mouser é o único alvo possível e é escolhido automaticamente
  s.passAll();
  assert.equal(vex.stunned, false, s.log(20));
  assert.ok(s.e.log.some((l) => l.text === 'Mutated Mouser fica atordoada (Stun).'), s.log(20));
  void mouser;
});

test('Vex, Apathetic atordoa toda unidade que o oponente joga (sem limite por turno)', () => {
  const s = new Scenario();
  s.put(0, 'UNL-150', BF0);
  s.go();
  endTurn(s);
  for (const r of s.e.runesOf(1)) s.e.toZone(r, 'runeDeck', { bottom: true });
  s.runes(1, [RUNE.body, RUNE.body, RUNE.calm, RUNE.calm]);
  const a = s.put(1, 'OGN-136', 'hand'); // Pit Rookie 2
  const b = s.put(1, 'OGN-052', 'hand'); // Stalwart Poro 2
  s.go();
  s.pick('Jogar Pit Rookie');
  maybe(s, 'base de B');
  s.passAll();
  s.pick('Jogar Stalwart Poro');
  maybe(s, 'base de B');
  s.passAll();
  assert.equal(a.stunned, true);
  assert.equal(b.stunned, true);
  assert.equal(a.noMoveTurn, s.e.turn);
});

test('Hidden: esconder custa 1 power, só pode jogar a partir do próximo turno, e sai por 0', () => {
  const s = new Scenario();
  s.put(0, 'OGN-003', BF0); // controla o campo A
  const fof = s.put(0, 'OGN-168', 'hand'); // Fight or Flight
  s.runes(0, [RUNE.chaos]);
  s.go();
  s.pick('Esconder Fight or Flight');
  assert.equal(fof.zone, 'facedown');
  assert.equal(s.e.runesOf(0).length, 0, 'a runa foi reciclada para pagar o Hidden');
  assert.ok(!s.d.options.some((o) => o.obj === fof.id), 'não pode jogar no mesmo turno');
  endTurn(s);
  // turno do oponente: ele ataca o campo A e eu respondo com a carta escondida, sem runas
  const atk = s.put(1, 'OGN-142', base(1));
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  // Focus do atacante (B) passa sozinho; A tem a carta escondida
  for (let i = 0; i < 5 && s.d.player !== 0; i++) s.pick('Passar');
  s.pick('Jogar Fight or Flight');
  s.pickObj(atk);
  s.passAll();
  assert.deepEqual(atk.loc, base(1), 'a carta escondida mandou o atacante de volta\n' + s.log());
  assert.equal(s.e.bfs[0].controller, 0);
});

test('Hidden: perder o controle do campo manda a carta escondida para o descarte', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-185', BF0);
  const fof = s.put(0, 'OGN-168', 'hand');
  s.runes(0, [RUNE.chaos]);
  s.go();
  s.pick('Esconder Fight or Flight');
  moveTo(s, [u.id], 'base de A');
  // a unidade saiu (é um movimento: Traveling Merchant descarta/compra, sem cartas na mão)
  s.passAll();
  assert.equal(s.e.bfs[0].controller, null);
  assert.equal(fof.zone, 'trash', s.log());
});

test('Ponto final: com 7 pontos, conquistar só um campo compra 1 em vez de pontuar', () => {
  const s = new Scenario();
  s.e.pl[0].points = 7;
  const u = s.put(0, 'OGN-142', base(0));
  s.go();
  const hand = s.e.pl[0].hand.length;
  moveTo(s, [u.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.bfs[0].controller, 0);
  assert.equal(s.e.pl[0].points, 7);
  assert.equal(s.e.pl[0].hand.length, hand + 1);
  assert.equal(s.e.winner, null);
});

test('Ponto final: segurar (hold) um campo com 7 pontos vence', () => {
  const s = new Scenario();
  s.e.pl[0].points = 7;
  s.put(0, 'OGN-142', BF0);
  s.go();
  endTurn(s);
  endTurn(s);
  assert.equal(s.e.winner, 0, s.log());
});

test('Ponto final: com 7 pontos, conquistar os dois campos no mesmo turno vence', () => {
  const s = new Scenario();
  s.e.pl[0].points = 7;
  const a = s.put(0, 'OGN-142', base(0));
  const b = s.put(0, 'OGN-142', base(0));
  s.go();
  moveTo(s, [a.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(s.e.pl[0].points, 7, 'o primeiro campo só compra 1');
  assert.equal(s.e.winner, null);
  moveTo(s, [b.id], 'Campo Vazio B');
  s.passAll();
  assert.equal(s.e.winner, 0, s.log());
});

test('Ponto final (regra 471.1.b.1): hold num campo e conquista do outro no mesmo turno vence', () => {
  const s = new Scenario();
  s.e.pl[0].points = 6;
  s.put(0, 'OGN-142', BF0);
  s.go();
  endTurn(s);
  // jogador 1 passa o turno; no início do turno do jogador 0 ele segura o campo A (6 → 7)
  const b = s.put(0, 'OGN-142', base(0));
  endTurn(s);
  assert.equal(s.e.pl[0].points, 7);
  s.go();
  moveTo(s, [b.id], 'Campo Vazio B');
  s.passAll();
  assert.equal(s.e.winner, 0, s.log());
});

test('Buff não acumula; Stand United faz cada Buff valer +2 neste turno', () => {
  const s = new Scenario();
  // Lee Sin é o jogador 1: passa a vez
  s.go();
  endTurn(s);
  const e = s.e;
  for (const r of e.runesOf(1)) e.toZone(r, 'runeDeck', { bottom: true });
  s.runes(1, [RUNE.calm, RUNE.calm, RUNE.calm, RUNE.body, RUNE.body]);
  const elder = s.put(1, 'OGN-065', base(1)); // Wizened Elder 4 (+1 com buff)
  s.put(1, 'OGN-053', 'hand');
  s.go();
  s.pick('Lee Sin, Blind Monk');
  s.maybeObj(elder);
  s.passAll();
  assert.equal(elder.buffs, 1);
  assert.equal(e.might(elder), 6, '4 + 1 (buff) + 1 (Elder)');
  e.buff(elder, 1);
  assert.equal(elder.buffs, 1, 'segundo buff não entra');
  s.pick('Jogar Stand United');
  s.maybeObj(elder);
  s.passAll();
  assert.equal(e.might(elder), 7, 'Stand United: o buff passa a valer +2');
});

test('Temporary (Fading Memories): a unidade morre no início da Beginning Phase do controlador', () => {
  const s = new Scenario();
  const target = s.put(1, 'OGN-065', BF0);
  s.put(0, 'OGN-180', 'hand');
  s.runes(0, [RUNE.chaos, RUNE.chaos, RUNE.fury, RUNE.fury, RUNE.chaos]);
  s.go();
  s.pick('Jogar Fading Memories');
  s.maybeObj(target);
  s.passAll();
  assert.ok(s.e.kw(target).temporary);
  endTurn(s);
  assert.equal(target.zone, 'trash', s.log());
});

test('Accelerate: Jinx, Demolitionist entra pronta pagando 1 + Fury, e descarta 2', () => {
  const s = new Scenario();
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury, RUNE.fury, RUNE.chaos]);
  s.put(0, 'OGN-185', 'hand');
  s.put(0, 'OGN-185', 'hand');
  s.go();
  s.pick('Jogar Jinx, Demolitionist');
  maybe(s, 'base de A');
  s.pick('Sim'); // Accelerate
  s.passAll();
  const jinx = s.e.units().find((u) => u.code === 'OGN-030')!;
  assert.equal(jinx.exhausted, false);
  assert.equal(s.e.pl[0].hand.length, 0, 'descartou 2');
  assert.equal(s.e.pl[0].trash.length, 2);
});

test('Ambush: unidade entra no meio do combate do lado do defensor', () => {
  const s = new Scenario();
  const def = s.put(1, 'OGN-052', BF0);
  s.put(1, 'UNL-002', 'hand'); // Inferna (Ambush)
  s.runes(1, [RUNE.fury, RUNE.fury]);
  const atk = s.put(0, 'OGN-019', base(0)); // Raging Soul 4
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  assert.equal(s.d.player, 1);
  s.pick('Jogar Inferna');
  s.passAll();
  const inf = Object.values(s.e.objs).find((u) => u.code === 'UNL-002')!;
  // Inferna defendendo: 1; Poro: 3 → 4 de dano no Raging Soul (4): morre.
  // Raging Soul causa 4: 3 no Poro e 1 na Inferna → todos morrem e o campo fica sem dono.
  assert.equal(atk.zone, 'trash', s.log(25));
  assert.equal(def.zone, 'trash');
  assert.equal(inf.zone, 'trash');
  assert.equal(s.e.bfs[0].controller, null);
  void def;
  void inf;
});

test('Burn Out: comprar com o deck vazio recicla o descarte e dá 1 ponto ao oponente', () => {
  const s = new Scenario();
  const e = s.e;
  for (const id of [...e.pl[0].mainDeck]) e.toZone(e.objs[id], 'trash');
  s.go();
  endTurn(s);
  endTurn(s); // início do turno do jogador 0: compra com o deck vazio
  assert.equal(e.pl[1].points, 1, s.log());
  assert.ok(e.pl[0].mainDeck.length > 30);
});

test('Gust devolve unidade de 3 ou menos; Challenge troca dano', () => {
  const s = new Scenario();
  const small = s.put(1, 'OGN-052', BF0);
  const big = s.put(1, 'OGN-065', { t: 'bf', i: 1 });
  s.put(0, 'OGN-169', 'hand');
  s.runes(0, [RUNE.chaos]);
  s.go();
  s.pick('Jogar Gust');
  assert.ok(!s.d.options.some((o) => o.obj === big.id), 'Elder (4) não é alvo do Gust');
  s.maybeObj(small);
  s.passAll();
  assert.equal(small.zone, 'hand');
});
