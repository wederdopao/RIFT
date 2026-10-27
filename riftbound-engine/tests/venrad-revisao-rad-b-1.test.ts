// Revisão independente do Radiance, RAD-085..RAD-105. Rodar: node --import tsx --test tests/venrad-revisao-rad-b-1.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const pow = (s: Scenario, p: P) => Object.values(s.e.pl[p].pool.power).reduce((a, b) => a + (b || 0), 0);
const runesOnBoard = (s: Scenario, p: P) => s.e.runesOf(p);

test('Seraphic Wyvern: só o controlador canaliza a runa a mais, e ela vem exaurida depois das N', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'RAD-092', base(0));
  s.go();
  // o oponente canaliza normalmente ("If you would channel")
  assert.equal(e.channel(1, 1), 1);
  assert.equal(runesOnBoard(s, 1).length, 1);
  // o controlador: 2 + 1 exaurida
  assert.equal(e.channel(0, 2), 3);
  const mine = runesOnBoard(s, 0);
  assert.equal(mine.length, 3);
  assert.equal(mine.filter((r) => r.exhausted).length, 1);
  // deck de runas com 2: as 2 runas "normais" vêm prontas; a a mais não existe (430.3)
  const deck = e.pl[0].runeDeck;
  while (deck.length > 2) e.objs[deck.pop()!].zone = 'gone';
  assert.equal(e.channel(0, 2), 2);
  const after = runesOnBoard(s, 0);
  assert.equal(after.length, 5);
  assert.equal(after.filter((r) => r.exhausted).length, 1, 'as duas novas entram prontas');
});

test('Satchel Charge: com a unidade alvo morta antes da resolução, a Bomb ainda é jogada', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'RAD-097', base(0)); // Siren of the Shallows
  s.put(0, 'RAD-096', 'hand');
  s.runes(0, rs(RUNE.chaos, 3));
  // a unidade morre logo antes de o Satchel Charge resolver
  const resolveTop = e.resolveTop.bind(e);
  e.resolveTop = function* () {
    if (e.chain[e.chain.length - 1]?.label === 'Satchel Charge' && u.zone === 'board') e.killAll([u]);
    return yield* resolveTop();
  };
  s.go();
  s.pick('Jogar Satchel Charge');
  s.maybeObj(u);
  if (/para onde/.test(s.d.prompt)) s.pick('Campo Vazio A');
  s.passAll();
  if (/Bomb/.test(s.d.prompt)) s.pick('Campo Vazio A');
  s.passAll();
  assert.ok(
    e.board().some((o) => o.code === 'TOK-BOMB' && o.controller === 0),
    s.log(),
  );
});

test('Gutter Guardian: com Show Off, o [Add] resolve na hora (429.2), sem ficar na pilha', () => {
  const s = new Scenario();
  const e = s.e;
  s.put(0, 'RAD-103', 'hand');
  s.put(0, 'RAD-100', 'hand'); // The Waters' Wage: tem [Hidden]
  s.runes(0, rs(RUNE.chaos, 3));
  s.go();
  s.pick('Jogar Gutter Guardian');
  for (let i = 0; i < 6 && s.d.kind !== 'priority' && s.d.kind !== 'action'; i++) {
    if (/revelar\/apontar/.test(s.d.prompt)) s.pick('Sim');
    else if (/qual carta/.test(s.d.prompt)) s.pick("The Waters' Wage");
    else if (/onde/.test(s.d.prompt)) s.pick('base');
    else break;
  }
  assert.equal(pow(s, 0), 1, s.log());
  assert.ok(!e.chain.some((x) => x.label.includes('[Add]')), 'o gatilho de [Add] não espera na pilha');
});

test('Gutter Guardian: sem Show Off não adiciona nada', () => {
  const s = new Scenario();
  s.put(0, 'RAD-103', 'hand');
  s.put(0, 'RAD-100', 'hand');
  s.runes(0, rs(RUNE.chaos, 3));
  s.go();
  s.pick('Jogar Gutter Guardian');
  for (let i = 0; i < 6 && s.d.kind !== 'priority' && s.d.kind !== 'action'; i++) {
    if (/revelar\/apontar/.test(s.d.prompt)) s.pick('Não');
    else if (/onde/.test(s.d.prompt)) s.pick('base');
    else break;
  }
  s.passAll();
  assert.equal(pow(s, 0), 0, s.log());
});

test('Reckless Innovator: o modo é escolhido ao pôr o gatilho na pilha; o [Chaos] é pago na resolução', () => {
  const s = new Scenario();
  const e = s.e;
  const u = s.put(0, 'RAD-105', base(0));
  s.runes(0, [RUNE.chaos]);
  s.put(0, 'RAD-097', 'deckTop');
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([u.id]);
  if (s.d.prompt.startsWith('Para onde')) s.pick('Campo Vazio A');
  assert.match(s.d.prompt, /Reckless Innovator: escolha um/, s.log());
  assert.ok(!e.log.some((l) => l.text.startsWith('Na pilha: Reckless Innovator')), 'ainda não foi para a pilha');
  const hand = e.pl[0].hand.length;
  s.pick('Pagar [Chaos] para comprar 1');
  assert.ok(e.log.some((l) => l.text.startsWith('Na pilha: Reckless Innovator')), s.log());
  for (let i = 0; i < 10 && s.g.current; i++) {
    if (/pagar \[Chaos\] para comprar/.test(s.d.prompt)) s.pick('Sim');
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
  assert.equal(e.pl[0].hand.length, hand + 1, s.log());
});
