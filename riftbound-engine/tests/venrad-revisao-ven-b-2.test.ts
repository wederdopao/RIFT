// Revisão independente do Vendetta, VEN-105..VEN-125: um teste por erro achado e corrigido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5

function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}

// ───────────── VEN-112 Zed, Without a Sound (ficha Shadow Clone) ─────────────
test('Shadow Clone: ao atacar, pode banir uma unidade do descarte para ganhar [Assault 4]', () => {
  const s = new Scenario();
  const clone = s.put(0, 'TOK-SHADOWCLONE', base(0));
  const dead = s.put(0, UNIT, 'trash');
  const foe = s.put(1, 'OGN-136', BF0); // Pit Rookie 2
  s.go();
  moveTo(s, [clone.id], 'Campo Vazio A');
  drain(s);
  assert.match(s.d.prompt, /Shadow Clone/, s.log(20));
  s.pick('Sim');
  if (s.d.prompt.includes('banir qual')) s.pickObj(dead);
  drain(s);
  assert.equal(dead.zone, 'banish', s.log(20));
  assert.equal(foe.zone, 'trash', 'o Clone (0 + Assault 4) mata o Pit Rookie\n' + s.log(20));
});

// ───────────── VEN-108 Forgotten Relic ─────────────
test('Forgotten Relic: com o deck vazio, o Burn Out recicla o descarte e a unidade queimada ainda dá +Might', () => {
  const s = new Scenario();
  const u = s.put(0, UNIT, base(0));
  s.e.pl[0].mainDeck = [];
  s.e.pl[0].trash = [];
  s.put(0, 'OGN-136', 'trash'); // Pit Rookie, Might 2: única carta, volta ao deck e é queimada
  s.put(0, 'VEN-108', 'hand');
  s.runes(0, rs(RUNE.chaos, 5));
  s.go();
  s.pick('Jogar Forgotten Relic');
  drain(s);
  s.maybeObj(u);
  drain(s);
  assert.equal(s.e.might(u), 7, s.log(20));
});

// ───────────── VEN-113 Kennen, Storm of Shuriken ─────────────
test('Kennen: spell com [Flow] impresso que ganha [Flow] pelo custo dele pode ser jogado por qualquer um dos dois', () => {
  const s = new Scenario();
  const ts = s.put(0, 'VEN-105', 'trash'); // Twilight Step: custo [2][Chaos], Flow [4][Chaos]
  const mover = s.put(0, 'OGN-136', base(0));
  s.e.grantFlow(ts, s.e.printedCost(ts)); // o que o gatilho de conquista do Kennen faz
  s.runes(0, rs(RUNE.chaos, 3)); // dá para o custo do spell, não para o Flow impresso
  s.go();
  s.pick('Jogar Twilight Step');
  if (s.d.prompt.includes('custo alternativo')) s.pick('Sim');
  s.maybeObj(mover);
  if (s.d.prompt.includes('para onde')) s.pick('Campo Vazio A');
  drain(s);
  assert.deepEqual(mover.loc, BF0, s.log(20));
  assert.equal(ts.zone, 'banish', 'jogado por Flow: banido');
});

// ───────────── VEN-124 Escaped Grayback ─────────────
test('Escaped Grayback: "Kill a friendly unit" inclui ela mesma', () => {
  const s = new Scenario();
  const gb = s.put(0, 'VEN-124', base(0));
  s.go();
  assert.ok(s.d.options.some((o) => o.label.startsWith('Escaped Grayback: Empower')), s.d.options.map((o) => o.label).join(' | '));
});
