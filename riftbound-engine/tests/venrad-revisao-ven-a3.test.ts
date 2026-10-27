// Revisão independente VEN-043..VEN-063: um teste por erro achado (e regressões de pontos sem ruling decididos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const MIND = 'OGN-089';
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5

function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
/** Roda um gerador do motor que não faz perguntas. */
function run(gen: Generator<any, any, any>) {
  let r = gen.next();
  while (!r.done) r = gen.next();
}

// ───────────────────────────── VEN-053 Otterpus ─────────────────────────────
test('Otterpus: no 1º turno do jogador, a conquista dele vira compra', () => {
  const s = new Scenario();
  s.put(0, 'VEN-053', base(0));
  s.put(0, MIND, 'deckTop');
  s.go();
  assert.equal(s.e.active, 0);
  const h = s.e.pl[0].hand.length;
  run(s.e.score(0, 0, 'conquer'));
  assert.equal(s.e.pl[0].points, 0);
  assert.equal(s.e.pl[0].hand.length, h + 1);
});

test('Otterpus: pontuar no turno do OPONENTE não é "during their first or second turn" — ganha o ponto', () => {
  const s = new Scenario();
  s.put(0, 'VEN-053', base(0));
  s.go();
  assert.equal(s.e.active, 0); // turno de A; B ainda não teve turno nenhum
  const h = s.e.pl[1].hand.length;
  run(s.e.score(1, 0, 'conquer'));
  assert.equal(s.e.pl[1].points, 1, s.log());
  assert.equal(s.e.pl[1].hand.length, h);
});

// ───────────────────────────── VEN-063 Nasus, Guardian of Knowledge ─────────────────────────────
test('Nasus, Guardian of Knowledge: duas mortes inimigas juntas aqui canalizam só 1 runa (uma vez por turno)', () => {
  const s = new Scenario();
  s.put(0, 'VEN-063', BF0);
  s.put(1, 'TOK-RECRUIT', BF0);
  s.put(1, 'TOK-RECRUIT', BF0);
  s.e.bfs[0].controller = 0;
  s.put(0, 'OGN-133', 'hand'); // Flurry of Blades: 1 em todas as unidades nos campos
  s.runes(0, rs(RUNE.body, 1));
  s.go();
  s.pick('Flurry');
  drain(s);
  assert.equal(s.e.unitsAtBf(0, 1).length, 0);
  assert.equal(s.e.runesOf(0).length, 2, s.log());
  assert.ok(s.e.runesOf(0).some((r) => r.exhausted));
});

test('Nasus, Guardian of Knowledge: morrendo junto com a unidade inimiga, não canaliza (383.2.c.2; RiftJudge #12049)', () => {
  const s = new Scenario();
  s.put(0, 'VEN-063', BF0);
  s.put(1, UNIT, BF0);
  s.e.bfs[0].controller = 0;
  s.put(0, 'OGN-123', 'hand'); // Unchecked Power: 12 em todas as unidades nos campos
  s.runes(0, rs(MIND, 7));
  s.go();
  const before = s.e.runesOf(0).length + s.e.pl[0].runeDeck.length;
  s.pick('Unchecked');
  drain(s);
  assert.equal(s.e.unitsAtBf(0).length, 0);
  assert.ok(!s.log(20).includes('canaliza 1'), s.log());
  assert.equal(s.e.runesOf(0).length + s.e.pl[0].runeDeck.length, before);
});

// ───────────────────────────── VEN-044 Astral Heron ─────────────────────────────
test('Astral Heron: jogada como 1ª carta num campo, ela mesma dispara e o desconto vai para a próxima (RiftJudge #12122)', () => {
  const s = new Scenario();
  s.put(0, UNIT, BF0);
  s.e.bfs[0].controller = 0;
  s.put(0, 'VEN-044', 'hand');
  const drake = s.put(0, 'VEN-048', 'hand'); // Cloud Drake [6]
  s.runes(0, rs(RUNE.calm, 7));
  s.go();
  s.pick('Jogar Astral Heron');
  s.pick('Campo Vazio A');
  drain(s);
  assert.equal(s.e.minCostFor(0, drake, 'hand').energy, 4, s.log());
});
