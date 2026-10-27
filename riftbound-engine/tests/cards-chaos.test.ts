// Testes de cenário das cartas do lote "chaos" (OGN-165..OGN-205).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';
import { getScript } from '../src/engine/script';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const C = RUNE.chaos;

function moveTo(s: Scenario, unitIds: string[], dest: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(dest);
}
function maybe(s: Scenario, text: string) {
  if (!s.d.root && s.d.options.some((o) => o.label.includes(text))) s.pick(text);
}
function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  for (let i = 0; i < 30 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
}
/** Passa prioridade/focus e escolhe a primeira opção quando pede a ordem de gatilhos simultâneos. */
function flow(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
/** Passa a vez até o turno de p (limpando as runas dele). */
function toTurnOf(s: Scenario, p: P) {
  if (s.e.active !== p) endTurn(s);
  for (const r of s.e.runesOf(p)) s.e.toZone(r, 'runeDeck', { bottom: true });
}

test('Morbid Return devolve uma unidade do seu descarte para a mão', () => {
  const s = new Scenario();
  const dead = s.put(0, 'OGN-019', 'trash');
  s.put(1, 'OGN-019', 'trash');
  s.put(0, 'OGN-170', 'hand');
  s.runes(0, [C, C]);
  s.go();
  s.pick('Jogar Morbid Return');
  assert.ok(!s.d.options.some((o) => o.label.includes('Raging') && o.obj !== dead.id), 'só unidades do seu descarte');
  s.maybeObj(dead);
  s.passAll();
  assert.equal(dead.zone, 'hand');
});

test('Rebuke devolve unidade num campo à mão do dono; Zaunite Bouncer devolve outra unidade num campo', () => {
  const s = new Scenario();
  const enemy = s.put(1, 'OGN-065', BF1);
  const mine = s.put(0, 'OGN-019', BF0);
  s.put(0, 'OGN-172', 'hand');
  s.put(0, 'OGN-188', 'hand');
  s.runes(0, [C, C, C, C, C, C]);
  s.go();
  s.pick('Jogar Rebuke');
  s.pickObj(enemy);
  s.passAll();
  assert.equal(enemy.zone, 'hand');
  assert.ok(s.e.pl[1].hand.includes(enemy.id));
  s.pick('Jogar Zaunite Bouncer');
  maybe(s, 'base de A');
  s.passAll();
  assert.equal(mine.zone, 'hand', 'única outra unidade num campo: a minha\n' + s.log());
});

test('Ride the Wind move uma unidade sua e a prepara', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-019', base(0), { ready: false });
  s.put(0, 'OGN-173', 'hand');
  s.runes(0, [C, C, C]);
  s.go();
  s.pick('Jogar Ride the Wind');
  s.maybeObj(u);
  s.passAll();
  s.pick('Campo Vazio B');
  s.passAll();
  assert.deepEqual(u.loc, BF1);
  assert.equal(u.exhausted, false);
  assert.equal(s.e.bfs[1].controller, 0, 'conquistou o campo vazio\n' + s.log());
});

test('Sneaky Deckhand pode ser jogada num campo aberto e conquista; sem a permissão, não', () => {
  const s = new Scenario();
  s.put(0, 'OGN-176', 'hand'); // Sneaky Deckhand
  s.put(0, 'OGN-175', 'hand'); // Shipyard Skulker
  s.runes(0, [C, C, C, C, C, C]);
  s.go();
  s.pick('Jogar Sneaky Deckhand');
  s.pick('Campo Vazio A');
  s.passAll();
  assert.equal(s.e.bfs[0].controller, 0, s.log());
  assert.equal(s.e.pl[0].points, 1);
  s.pick('Jogar Shipyard Skulker');
  assert.ok(!s.d.options.some((o) => o.label === 'Campo Vazio B'), 'Skulker não vai para campo aberto');
});

test('Miss Fortune, Buccaneer: unidades aliadas podem ser jogadas em campos abertos', () => {
  const s = new Scenario();
  s.put(0, 'OGN-193', base(0));
  s.put(1, 'OGN-019', BF1); // campo B ocupado (não é aberto)
  s.put(0, 'OGN-175', 'hand');
  s.runes(0, [C, C, C]);
  s.go();
  s.pick('Jogar Shipyard Skulker');
  const labels = s.d.options.map((o) => o.label);
  assert.ok(labels.includes('Campo Vazio A'), labels.join('|'));
  assert.ok(!labels.includes('Campo Vazio B'), 'campo com unidade inimiga não é aberto');
});

test('Stealthy Pursuer pode ir junto quando uma unidade aliada sai do local dele', () => {
  const s = new Scenario();
  const p = s.put(0, 'OGN-177', base(0));
  const a = s.put(0, 'OGN-019', base(0));
  const b = s.put(0, 'OGN-019', base(0));
  s.go();
  moveTo(s, [a.id, b.id], 'Campo Vazio A');
  assert.match(s.d.prompt, /Stealthy Pursuer/);
  s.pick('Sim');
  s.passAll();
  assert.deepEqual(p.loc, BF0, s.log());
  assert.equal(p.exhausted, false, 'não é movimento padrão: não exaure');
  assert.equal(s.g.current?.kind, 'action', 'perguntou uma vez só para o lote');
});

test('Acceptable Losses: cada jogador mata um gear seu', () => {
  const s = new Scenario();
  const g0 = s.put(0, 'OGN-182', base(0)); // Scrapheap
  const g1a = s.put(1, 'OGN-184', base(1));
  const g1b = s.put(1, 'OGN-204', base(1));
  s.put(0, 'OGN-179', 'hand');
  s.runes(0, [C]);
  s.go();
  s.pick('Jogar Acceptable Losses');
  s.passAll();
  assert.equal(s.d.player, 1);
  s.pickObj(g1b);
  s.passAll();
  assert.equal(g0.zone, 'trash');
  assert.equal(g1b.zone, 'trash');
  assert.equal(g1a.zone, 'board');
});

test('Pack of Wonders devolve outro gear ou unidade sua, ou uma carta escondida sua', () => {
  const s = new Scenario();
  const pack = s.put(0, 'OGN-181', base(0));
  const u = s.put(0, 'OGN-019', BF0);
  const fof = s.put(0, 'OGN-168', 'hand');
  s.runes(0, [C]);
  s.go();
  s.pick('Esconder Fight or Flight');
  s.pick('Pack of Wonders: Devolver');
  s.pick('Uma carta escondida');
  s.passAll();
  assert.equal(fof.zone, 'hand', s.log());
  assert.equal(pack.exhausted, true);
  assert.equal(u.zone, 'board');
});

test('Stacked Deck: olha 3, uma vai para a mão e o resto é reciclado', () => {
  const s = new Scenario();
  const e = s.e;
  const c3 = s.put(0, 'OGN-175', 'deckTop');
  const c2 = s.put(0, 'OGN-176', 'deckTop');
  const c1 = s.put(0, 'OGN-019', 'deckTop');
  s.put(0, 'OGN-183', 'hand');
  s.runes(0, [C]);
  s.go();
  s.pick('Jogar Stacked Deck');
  s.passAll();
  s.pickObj(c2);
  assert.equal(c2.zone, 'hand');
  const deck = e.pl[0].mainDeck;
  assert.ok(deck.indexOf(c1.id) >= deck.length - 2 && deck.indexOf(c3.id) >= deck.length - 2, 'reciclados no fundo');
});

test('Nocturne: ao ser visto pelo Vision, pode ser banido e jogado por 1 power', () => {
  const s = new Scenario();
  const noc = s.put(0, 'OGN-194', 'deckTop');
  s.put(0, 'OGN-171', 'hand'); // Mystic Poro (Vision)
  s.runes(0, [C, C, C]);
  s.go();
  s.pick('Jogar Mystic Poro');
  maybe(s, 'base de A');
  s.passAll();
  assert.match(s.d.prompt, /Nocturne/);
  s.pick('Sim'); // banir
  assert.equal(noc.zone, 'banish');
  s.pick('Sim'); // jogar por 1 power
  maybe(s, 'base de A');
  s.passAll();
  assert.equal(noc.zone, 'board', s.log());
});

test('The Syren move uma unidade sua num campo para a base; Treasure Trove compra e canaliza ao sair', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'OGN-184', base(0));
  const trove = s.put(0, 'OGN-186', base(0));
  const u = s.put(0, 'OGN-019', BF0);
  s.runes(0, [C, C]);
  s.go();
  s.pick('The Syren: Mover');
  s.passAll();
  assert.deepEqual(u.loc, base(0));
  const hand = e.pl[0].hand.length;
  const runes = e.runesOf(0).length;
  s.pick('Treasure Trove: Matar');
  s.passAll();
  assert.equal(trove.zone, 'trash');
  assert.equal(e.pl[0].hand.length, hand + 1, s.log());
  // pagou 1 Chaos (runa reciclada) e canalizou 1 exaurida
  assert.equal(e.runesOf(0).length, runes);
  assert.ok(e.runesOf(0).some((r) => r.exhausted));
});

test('Treasure Trove também dispara ao voltar para a mão (Pack of Wonders)', () => {
  const s = new Scenario();
  const trove = s.put(0, 'OGN-186', base(0));
  s.put(0, 'OGN-181', base(0));
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.pick('Pack of Wonders: Devolver');
  s.maybeObj(trove);
  flow(s);
  assert.equal(trove.zone, 'hand');
  assert.equal(s.e.pl[0].hand.length, hand + 2, 'o próprio Trove + 1 comprada\n' + s.log());
  assert.equal(s.e.runesOf(0).length, 1);
});

test('Whirlwind: o oponente escolhe primeiro, depois quem jogou', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-019', BF0);
  const theirs = s.put(1, 'OGN-065', BF1);
  s.put(0, 'OGN-187', 'hand');
  s.runes(0, [C, C, C, C, C]);
  s.go();
  s.pick('Jogar Whirlwind');
  s.passAll();
  assert.equal(s.d.player, 1);
  s.pickObj(mine);
  assert.equal(s.d.player, 0);
  s.pickObj(theirs);
  assert.equal(mine.zone, 'hand');
  assert.equal(theirs.zone, 'hand');
});

test('Kayn, Unleashed não recebe dano depois de se mover duas vezes no turno', () => {
  const s = new Scenario();
  const kayn = s.put(0, 'OGN-189', base(0));
  const e = s.e;
  s.go();
  e.dealDamage(kayn, 1);
  assert.equal(kayn.damage, 1);
  kayn.damage = 0;
  e.moveUnits([kayn], BF0, 0);
  e.moveUnits([kayn], BF1, 0);
  assert.equal(e.movesThisTurn(kayn), 2);
  assert.equal(e.dealDamage(kayn, 5), 0);
  assert.equal(kayn.damage, 0);
});

test('Kayn imune fica fora da atribuição de dano letal no combate', () => {
  const s = new Scenario();
  const kayn = s.put(1, 'OGN-189', BF0);
  const rook = s.put(1, 'OGN-136', BF0); // Pit Rookie 2
  const e = s.e;
  kayn.data = { moveTurn: e.turn, moves: 2 };
  const atk = s.put(0, 'OGN-142', base(0)); // Mountain Drake 10
  s.go();
  moveTo(s, [atk.id], 'Campo Vazio A');
  s.passAll();
  assert.equal(kayn.zone, 'board', s.log(20));
  assert.equal(rook.zone, 'trash');
});

test("Kog'Maw: Deathknell causa 4 a todas as unidades no campo onde morreu", () => {
  const s = new Scenario();
  const kog = s.put(0, 'OGN-190', BF0);
  const a = s.put(0, 'OGN-019', BF0); // 4
  const b = s.put(1, 'OGN-065', BF0); // 4
  const far = s.put(1, 'OGN-065', BF1);
  s.put(0, 'OGN-024', 'hand'); // Void Seeker: 4 de dano numa unidade num campo
  s.runes(0, [RUNE.fury, RUNE.fury, RUNE.fury]);
  s.go();
  s.pick('Jogar Void Seeker');
  s.pickObj(kog);
  flow(s);
  assert.equal(a.zone, 'trash', s.log());
  assert.equal(b.zone, 'trash');
  assert.equal(far.zone, 'board');
});

test('Maddened Marauder: ao jogar, move uma unidade de um campo para a base dela', () => {
  const s = new Scenario();
  const enemy = s.put(1, 'OGN-065', BF1);
  s.put(0, 'OGN-191', 'hand');
  s.runes(0, [C, C, C, C, C]);
  s.go();
  s.pick('Jogar Maddened Marauder');
  maybe(s, 'base de A');
  s.passAll();
  assert.deepEqual(enemy.loc, base(1), s.log());
});

test('Mindsplitter: o oponente revela a mão e descarta a carta escolhida', () => {
  const s = new Scenario();
  const x = s.put(1, 'OGN-019', 'hand');
  const y = s.put(1, 'OGN-065', 'hand');
  s.put(0, 'OGN-192', 'hand');
  s.runes(0, [C, C, C, C, C, C, C]);
  s.go();
  s.pick('Jogar Mindsplitter');
  maybe(s, 'base de A');
  s.passAll();
  assert.equal(s.d.player, 0);
  s.pickObj(y);
  assert.equal(y.zone, 'trash');
  assert.equal(x.zone, 'hand');
  assert.equal(s.e.pl[1].discardedThisTurn, 1);
});

test('Soulgorger joga uma unidade do descarte pagando só o power; The Harrowing também', () => {
  const s = new Scenario();
  const e = s.e;
  const dead = s.put(0, 'OGN-189', 'trash'); // Kayn: 6 energia + 1 Chaos
  s.put(0, 'OGN-196', 'hand'); // Soulgorger 8 + 2 Chaos
  s.runes(0, [C, C, C, C, C, C, C, C, C]);
  s.go();
  s.pick('Jogar Soulgorger');
  maybe(s, 'base de A');
  s.passAll();
  s.pick('Sim');
  maybe(s, 'base de A');
  s.passAll();
  assert.equal(dead.zone, 'board', s.log());
  assert.equal(e.runesOf(0).length, 6, '9 runas - 2 (Soulgorger) - 1 (Kayn)');
});

test('The Harrowing joga uma unidade do descarte ignorando a energia', () => {
  const s = new Scenario();
  const dead = s.put(0, 'OGN-142', 'trash'); // Mountain Drake
  s.put(0, 'OGN-198', 'hand');
  s.runes(0, [C, C, C, C, C, C, RUNE.fury, RUNE.fury]);
  s.go();
  s.pick('Jogar The Harrowing');
  s.maybeObj(dead);
  s.passAll();
  maybe(s, 'base de A');
  s.passAll();
  assert.equal(dead.zone, 'board', s.log());
});

test('Teemo, Scout escondido: jogado por 0 ganha +3; Ember Monk ganha +2 quando você joga carta escondida', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'OGN-019', BF0); // controla o campo A
  const monk = s.put(0, 'OGN-167', base(0));
  const teemo = s.put(0, 'OGN-197', 'hand');
  s.runes(0, [C]);
  s.go();
  s.pick('Esconder Teemo');
  endTurn(s);
  endTurn(s);
  s.pick('Jogar Teemo, Scout');
  flow(s);
  assert.equal(teemo.zone, 'board');
  assert.equal(e.might(teemo), 4, s.log());
  assert.equal(e.might(monk), 6);
});

test('Ember Monk: spell escondido também conta', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'OGN-019', BF0);
  const monk = s.put(0, 'OGN-167', base(0));
  s.put(0, 'OGN-168', 'hand'); // Fight or Flight
  s.runes(0, [C]);
  s.go();
  s.pick('Esconder Fight or Flight');
  endTurn(s);
  endTurn(s);
  s.pick('Jogar Fight or Flight');
  s.passAll();
  assert.equal(e.might(monk), 6, s.log());
});

test('Tideturner troca de lugar com uma unidade sua em outro local', () => {
  const s = new Scenario();
  const other = s.put(0, 'OGN-019', BF0);
  s.put(0, 'OGN-199', 'hand');
  s.runes(0, [C, C]);
  s.go();
  s.pick('Jogar Tideturner');
  s.pick('base de A');
  s.passAll();
  s.pick('Sim');
  s.passAll();
  const tt = s.e.units().find((u) => u.code === 'OGN-199')!;
  assert.deepEqual(tt.loc, BF0, s.log());
  assert.deepEqual(other.loc, base(0));
});

test('Twisted Fate: ao atacar revela a runa do topo (Fury: 2 numa inimiga e 1 nas outras)', () => {
  const s = new Scenario();
  const e = s.e;
  const tf = s.put(0, 'OGN-200', base(0));
  const a = s.put(1, 'OGN-136', BF0); // Pit Rookie 2
  const b = s.put(1, 'OGN-065', BF0); // Elder 4
  // runa Fury no topo do deck de runas
  const fury = e.pl[0].runeDeck.map((id) => e.objs[id]).find((r) => r.code === RUNE.fury)!;
  e.toZone(fury, 'runeDeck');
  s.go();
  moveTo(s, [tf.id], 'Campo Vazio A');
  s.passAll(2);
  s.pickObj(a);
  assert.equal(e.pl[0].runeDeck[e.pl[0].runeDeck.length - 1], fury.id, 'runa reciclada');
  assert.equal(a.zone, 'trash', s.log());
  assert.equal(b.damage >= 1 || b.zone !== 'board', true);
});

test('Invert Timelines: cada um descarta a mão e compra 4; Jinx, Rebel dispara uma vez', () => {
  const s = new Scenario();
  const e = s.e;
  const jinx = s.put(0, 'OGN-202', base(0), { ready: false });
  s.put(0, 'OGN-019', 'hand');
  s.put(0, 'OGN-019', 'hand');
  s.put(1, 'OGN-065', 'hand');
  s.put(0, 'OGN-201', 'hand');
  s.runes(0, [C, C, C, C]);
  s.go();
  s.pick('Jogar Invert Timelines');
  s.passAll();
  assert.equal(e.pl[0].hand.length, 4);
  assert.equal(e.pl[1].hand.length, 4);
  assert.equal(jinx.exhausted, false);
  assert.equal(e.might(jinx), 6, 'só +1: "uma ou mais cartas" dispara uma vez\n' + s.log());
});

test('Possession: assume o controle de uma unidade inimiga num campo e a manda para a sua base', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(1, 'OGN-065', BF1);
  s.put(0, 'OGN-203', 'hand');
  s.runes(0, [C, C, C, C, C, C, C, C, C, C, C]);
  s.go();
  s.pick('Jogar Possession');
  s.maybeObj(u);
  s.passAll();
  assert.equal(u.controller, 0);
  assert.deepEqual(u.loc, base(0));
  assert.equal(e.bfs[1].controller, null, 'campo B fica sem dono\n' + s.log());
});

test('Seal of Discord: habilidade de Add (exaurir) que gera Chaos para o pagamento automático', () => {
  const sc = getScript('OGN-204')!;
  const a = sc.activated![0];
  assert.equal(a.isAdd, true);
  assert.equal(a.exhaustSelf, true);
  assert.equal(a.addPower, 'Chaos');
});

test('Yasuo, Windrider: no terceiro movimento do turno você ganha 1 ponto', () => {
  const s = new Scenario();
  const e = s.e;
  const y = s.put(0, 'OGN-205', base(0));
  s.go();
  e.moveUnits([y], BF0, 0);
  e.moveUnits([y], BF1, 0);
  assert.equal(e.pending.length, 0);
  s.go();
  moveTo(s, [y.id], 'base de A'); // terceiro movimento
  flow(s);
  assert.equal(e.pl[0].points, 1, s.log());
});
