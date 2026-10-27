// Informações que o motor dá para a mesa (não mudam a partida): motivo de não poder jogar, histórico com alvos,
// marca de pergunta de alvo/local e passes seguidos na pilha.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';

const MIND = 'OGN-089';

test('playBlockReason: sem runas diz o custo; com runas, pode jogar', () => {
  const s = new Scenario();
  const c = s.put(0, 'OGN-106', 'hand'); // Sprite Mother, custo 4
  s.go();
  assert.match(s.e.playBlockReason(0, c, 'hand', 'main') || '', /recursos insuficientes/);
  const s2 = new Scenario();
  const c2 = s2.put(0, 'OGN-106', 'hand');
  s2.runes(0, Array(4).fill(MIND));
  s2.go();
  assert.equal(s2.e.playBlockReason(0, c2, 'hand', 'main'), null);
});

test('playBlockReason: unidade com a pilha aberta explica o timing', () => {
  const s = new Scenario();
  const c = s.put(0, 'OGN-106', 'hand');
  s.runes(0, Array(4).fill(MIND));
  s.go();
  assert.match(s.e.playBlockReason(0, c, 'hand', 'priority') || '', /fase principal/);
});

test('jogar uma unidade: a pergunta de local é marcada e o registro guarda a carta', () => {
  const s = new Scenario();
  s.put(0, 'OGN-106', 'hand');
  s.runes(0, Array(4).fill(MIND));
  s.go();
  s.pick('Jogar Sprite Mother');
  if (s.d.prompt.includes('onde')) {
    assert.equal(s.d.purpose, 'location');
    s.pick('base de A');
  }
  s.passAll();
  const plays = s.e.log.filter((l) => l.meta?.kind === 'play');
  assert.ok(plays.some((l) => l.meta!.code === 'OGN-106'));
});
