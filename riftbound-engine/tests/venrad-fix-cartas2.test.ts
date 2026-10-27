// Rodada 2 do Vendetta/Radiance, frente "cartas individuais" (parte 2): mais um teste por correção.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5 (Fury)

function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}

// ───────────────────────────── VEN-034 Resonating Strike ─────────────────────────────
test('Resonating Strike: campo e unidade escolhidos ao jogar; move e dá +2 Might', () => {
  const s = new Scenario();
  s.put(0, UNIT, BF0); // garante que controlo o campo A
  const u = s.put(0, 'VEN-117', base(0)); // Disciple of Shen 1/1
  s.put(0, 'VEN-034', 'hand');
  s.runes(0, rs(RUNE.calm, 3));
  s.go();
  s.pick('Jogar Resonating Strike');
  drain(s);
  assert.deepEqual(u.loc, BF0, s.log());
  assert.equal(s.e.might(u), 1 + 2);
});

// ───────────────────────────── RAD-033 Command: Attack ─────────────────────────────
test('Command: Attack: move um gear aliado com Deploy (destino escolhido ao jogar)', () => {
  const s = new Scenario();
  const banner = s.put(0, 'RAD-002', BF0); // Banner of Conquest [Deploy]
  s.put(0, 'RAD-033', 'hand');
  s.runes(0, rs(RUNE.calm, 3));
  s.go();
  s.pick('Jogar Command: Attack');
  s.pick('Mover'); // modo
  drain(s);
  assert.deepEqual(banner.loc, BF1, s.log());
});

// ───────────────────────────── RAD-084 Cataclysm ─────────────────────────────
test('Cataclysm: oponente não joga spells no turno e a unidade vai ao campo inimigo ocupado', () => {
  const s = new Scenario();
  const u = s.put(0, UNIT, base(0));
  s.put(1, 'VEN-117', BF1);
  s.put(0, 'RAD-084', 'hand');
  s.runes(0, rs(RUNE.body, 5));
  s.go();
  s.pick('Jogar Cataclysm');
  drain(s);
  assert.deepEqual(u.loc, BF1, s.log());
  assert.ok(s.e.effects.some((e) => e.flag === 'cantPlaySpells' && e.player === 1));
});

// ───────────────────────────── VEN-091 Corrupted Dragon ─────────────────────────────
test('Corrupted Dragon: o jogador escolhe QUAIS unidades inimigas (Might <= 5) vão para a base', () => {
  const s = new Scenario();
  const dragon = s.put(0, 'VEN-091', base(0));
  const a = s.put(1, 'VEN-117', BF1);
  const b = s.put(1, 'VEN-123', BF1);
  const big = s.put(1, 'VEN-118', BF1); // 6 de Might: fora
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([dragon.id]);
  if (s.d.prompt.startsWith('Para onde')) s.pick('Campo Vazio B');
  for (let i = 0; i < 10 && !/Corrupted Dragon/.test(s.d.prompt); i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
  assert.match(s.d.prompt, /Corrupted Dragon/, s.log());
  s.pick('Sim');
  assert.ok(!s.d.options.some((o) => o.obj === big.id), 'Might 6 fica de fora');
  s.ok([a.id]);
  assert.deepEqual(a.loc, base(1), s.log());
  assert.notDeepEqual(b.loc, base(1), 'a outra não foi movida (ficou e entrou em combate)');
});

// ───────────────────────────── VEN-102 Ravenbloom Prefect ─────────────────────────────
test('Ravenbloom Prefect: banir-se é o custo; o gear jogado pelo oponente é banido', () => {
  const s = new Scenario();
  const pref = s.put(1, 'VEN-102', base(1));
  s.put(0, 'OGN-021', 'hand'); // Sun Disc (gear)
  s.runes(0, rs(RUNE.fury, 3));
  s.go();
  s.pick('Jogar Sun Disc');
  for (let i = 0; i < 10 && !/Ravenbloom/.test(s.d.prompt); i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
  assert.match(s.d.prompt, /Ravenbloom/, s.log());
  s.pick('Sim');
  drain(s);
  assert.equal(pref.zone, 'banish', s.log());
  assert.ok(s.e.pl[0].banish.some((id) => s.e.objs[id].code === 'OGN-021'), 'o gear foi banido');
});

// ───────────────────────────── RAD-088 Staunch Survivor ─────────────────────────────
test('Staunch Survivor: Assault 2 e Shield 2 dão +2 cada, sem contar o Assault em dobro', () => {
  const s = new Scenario();
  const u = s.put(0, 'RAD-088', BF0);
  assert.equal(s.e.might(u), 2);
  u.role = 'attacker';
  assert.equal(s.e.might(u), 4);
  u.role = 'defender';
  assert.equal(s.e.might(u), 4);
});

// ───────────────────────────── RAD-040 Heartening Soul ─────────────────────────────
test('Heartening Soul: só as lendas ganham a habilidade [Tap] (a unidade não)', () => {
  const s = new Scenario();
  const soul = s.put(0, 'RAD-040', base(0));
  s.go();
  const labels = s.d.options.map((o) => o.label);
  assert.ok(labels.some((l) => l.includes('Jinx') && l.includes('+3 de Might')), labels.join('|'));
  assert.ok(!labels.some((l) => l.startsWith('Heartening Soul') && l.includes('+3 de Might')), 'a própria unidade não tem a habilidade: ' + labels.join('|'));
  void soul;
});
