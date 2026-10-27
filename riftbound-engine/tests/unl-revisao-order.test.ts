// Revisão independente do Unleashed, intervalo UNL-151..UNL-180 (lote order). Rodar: npm test
// Cada teste reproduz um erro achado na revisão (falhava antes da correção).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Obj, P } from '../src/engine/types';

const ORDER = 'OGN-214';
const CALM = 'OGN-042';
const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const PORO = 'OGN-210'; // Daring Poro: Order, 2 de Might, custo 2, Poro
const SERGEANT = 'OGN-219'; // Order, 4 de Might, sem tag

const runes = (s: Scenario, p: P, code: string, n: number) => s.runes(p, Array(n).fill(code));
function play(s: Scenario, name: string, where?: string) {
  s.pick(`Jogar ${name}`);
  if (where && s.d.prompt.startsWith(`Jogar ${name} onde`)) s.pick(where);
}
function drainAll(s: Scenario) {
  for (let k = 0; k < 40 && s.g.current; k++) {
    if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
}
void drainAll;
void ORDER;

test('Ivern, Friend to All × Poro Herder: a tag Poro dada ao Ivern conta como "você controla um Poro"', () => {
  const s = new Scenario();
  const iv = s.put(0, 'UNL-177', 'hand');
  runes(s, 0, ORDER, 6);
  s.go();
  play(s, 'Ivern, Friend to all', 'base');
  s.pick('Poro');
  s.passAll();
  assert.equal(s.e.hasTag(iv, 'Poro'), true);
  const ph = s.put(0, 'OGN-061', 'hand');
  for (let k = 0; k < 3; k++) s.put(0, SERGEANT, 'deckTop');
  runes(s, 0, CALM, 4);
  s.go();
  play(s, 'Poro Herder', 'base');
  s.passAll();
  assert.equal(ph.buffs, 1, s.log(20));
  assert.equal(s.e.pl[0].hand.length, 1);
});

test('Mageseeker Investigator × Tricksy Tentacles: quem move escolhe se paga o custo aplicado; sem pagar, nada se move', () => {
  const s = new Scenario();
  s.put(1, 'UNL-163', BF0);
  const a = s.put(1, PORO, base(1));
  const b = s.put(1, PORO, base(1));
  s.put(0, 'UNL-054', 'hand');
  runes(s, 0, CALM, 6);
  s.go();
  play(s, 'Tricksy Tentacles');
  s.pickObj(a);
  s.pickObj(b);
  if (s.d.prompt.includes('nenhuma para parar')) s.ok([]);
  s.pick('Campo Vazio A');
  s.passAll();
  assert.match(s.d.prompt, /custo aplicado/, s.log(20));
  const before = s.e.runesOf(0).length;
  s.pick('Não');
  s.passAll();
  assert.deepEqual(a.loc, base(1));
  assert.deepEqual(b.loc, base(1));
  assert.equal(s.e.runesOf(0).length, before, 'nenhuma runa gasta no custo aplicado');
});

test('Mageseeker Investigator: unidade que quem move está proibido de mover (Vex, Apathetic) não conta para o custo aplicado', () => {
  const s = new Scenario();
  s.put(1, 'UNL-163', BF0);
  const a = s.put(1, PORO, base(1));
  const b = s.put(1, PORO, base(1));
  b.noMoveTurn = s.e.turn; // "ele não pode movê-la neste turno"
  b.noMoveBy = 0;
  s.put(0, 'UNL-054', 'hand');
  runes(s, 0, CALM, 6);
  s.go();
  play(s, 'Tricksy Tentacles');
  s.pickObj(a);
  s.pickObj(b);
  if (s.d.prompt.includes('nenhuma para parar')) s.ok([]);
  s.pick('Campo Vazio A');
  const before = s.e.runesOf(0).length;
  s.passAll();
  assert.doesNotMatch(s.d.prompt, /custo aplicado/);
  assert.deepEqual(a.loc, BF0, s.log(20));
  assert.deepEqual(b.loc, base(1));
  assert.equal(s.e.runesOf(0).length, before);
});
void ({} as Obj);
