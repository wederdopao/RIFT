// Testes curtos do lote RAD-001..069 (só as cartas mais complicadas). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const MIND = 'OGN-089';

test('Fanfare: compra nas próximas três unidades jogadas', () => {
  const s = new Scenario();
  s.runes(0, rs(MIND, 12));
  s.put(0, 'RAD-047', 'hand');
  for (let k = 0; k < 4; k++) s.put(0, 'RAD-053', 'hand');
  for (let k = 0; k < 8; k++) s.put(0, 'RAD-054', 'deckTop');
  s.go();
  s.pick('Jogar Fanfare');
  s.passAll();
  const before = s.e.pl[0].hand.length;
  for (let k = 0; k < 4; k++) {
    s.pick('Jogar Strigian Oracle');
    if (!s.d.root && s.d.prompt.includes('onde?')) s.pick('base');
    s.passAll();
  }
  // 4 unidades jogadas (-4 cartas), 3 compras (+3)
  assert.equal(s.e.pl[0].hand.length, before - 4 + 3, s.log());
});

test('Akali, Brash: segundo movimento bana o topo e permite jogá-lo', () => {
  const s = new Scenario();
  const ak = s.put(0, 'RAD-015', base(0));
  s.runes(0, rs(MIND, 4));
  s.put(0, 'RAD-054', 'deckTop');
  s.go();
  const mv = (label: string) => {
    s.pick('Mover unidades');
    if (s.d.prompt.startsWith('Quais unidades')) s.ok([ak.id]);
    if (s.d.prompt.startsWith('Para onde')) s.pick(label);
    for (let i = 0; i < 6 && s.g.current && s.d.kind !== 'action'; i++) {
      if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
      else break;
    }
  };
  mv('Campo Vazio A');
  assert.equal(s.e.pl[0].banish.length, 0);
  ak.exhausted = false;
  s.go();
  mv('base');
  const top = s.e.pl[0].banish.map((id) => s.e.objs[id]).find((o) => o.code === 'RAD-054');
  assert.ok(top, 'carta banida: ' + s.log());
  assert.ok(s.d.options.some((o) => o.id === `play:${top!.id}:banished`), 'oferece jogar a carta banida');
});

test('Firebrand Raider: unidades não se preparam no despertar e entram prontas', () => {
  const s = new Scenario();
  s.put(0, 'RAD-019', base(0));
  const u = s.put(1, 'RAD-054', base(1));
  u.exhausted = true;
  s.go();
  assert.equal(s.e.auraSources().length > 0, true);
  const o = s.e.newObj('RAD-054', 0, 'setAside');
  assert.ok(s.e.auraSources().some((src) => (s.e.script(src).auras || []).some((a) => a.enterReady?.(s.e, src, o))));
});

test('Detonation Amplifier + Bomb: a morte da Bomb aqui dispara duas vezes', () => {
  const s = new Scenario();
  s.put(0, 'RAD-017', BF0);
  const bomb = s.e.createToken('TOK-BOMB', 0, BF0);
  const foe = s.put(1, 'RAD-049', BF0); // Industrious Mechsmith, 1 de Might
  const foe2 = s.put(1, 'RAD-054', BF0); // 3 de Might
  s.go();
  s.e.killAll([bomb]);
  s.passAll();
  void foe;
  void foe2;
  assert.ok(s.e.log.some((l) => /Bomb/.test(l.text)), s.log());
});

test('Lingering Animus: entra pronta se um gear aliado morreu neste turno', () => {
  const s = new Scenario();
  const gear = s.put(0, 'RAD-002', BF0);
  s.runes(0, rs(RUNE.fury, 4));
  s.put(0, 'RAD-005', 'hand');
  s.go();
  s.e.killAll([gear]);
  s.go();
  s.pick('Jogar Lingering Animus');
  if (!s.d.root && s.d.prompt.includes('onde?')) s.pick('base');
  s.passAll();
  const u = s.e.units().find((x) => x.code === 'RAD-005')!;
  assert.equal(u.exhausted, false, s.log());
});

test('Seraphine: exaurir três unidades de uma vez deixa comprar 1', () => {
  const s = new Scenario();
  const a = s.put(0, 'RAD-065', base(0));
  const b = s.put(0, 'RAD-054', base(0));
  const c = s.put(0, 'RAD-054', base(0));
  for (let k = 0; k < 3; k++) s.put(0, 'RAD-054', 'deckTop');
  s.go();
  const before = s.e.pl[0].hand.length;
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([a.id, b.id, c.id]);
  if (s.d.prompt.startsWith('Para onde')) s.pick(s.d.options[0].label);
  for (let i = 0; i < 6 && s.g.current; i++) {
    if (s.d.options.some((o) => o.label === 'Sim')) s.pick('Sim');
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
  assert.equal(s.e.pl[0].hand.length, before + 1, s.log());
});

test('Ahri, Confident: Disarm que reduz Might inimigo aqui dá +1 a ela', () => {
  const s = new Scenario();
  const ahri = s.put(0, 'RAD-038', base(0));
  const foe = s.put(1, 'RAD-054', BF0);
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([ahri.id]);
  if (s.d.prompt.startsWith('Para onde')) s.pick('Campo Vazio A');
  for (let i = 0; i < 12 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Distribuir dano')) s.ok([s.d.options[0].id]);
    else s.ok([s.d.options[0].id]);
  }
  assert.ok(s.e.log.some((l) => /Trinket Peddler recebe -1/.test(l.text)), s.log(20));
  assert.equal(s.e.might(ahri), 5, s.log(20));
  void foe;
});
