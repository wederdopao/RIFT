// Revisão independente do Vendetta, VEN-001..VEN-021: um teste por erro achado (e alguns de conferência).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';
import { getScript } from '../src/engine/script';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5 (Fury)

/** Passa a prioridade e ordena gatilhos simultâneos até chegar numa decisão que não é de passar. */
function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}
function moveTo(s: Scenario, ids: string[], label: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(ids);
  if (s.d.prompt.startsWith('Para onde')) s.pick(label);
}

// ───────────────────────────── VEN-002 Blade Twirler ─────────────────────────────
test('Blade Twirler: o jogador é escolhido ao pôr o gatilho na pilha (355.9.a, 355.5); só no 1º movimento', () => {
  const s = new Scenario();
  const tw = s.put(0, 'VEN-002', base(0));
  s.go();
  moveTo(s, [tw.id], 'Campo Vazio A');
  // a escolha vem antes de qualquer passe de prioridade (finalização), não na resolução
  assert.match(s.d.prompt, /Blade Twirler: qual jogador/, s.log());
  assert.ok(!s.e.log.some((l) => l.text.startsWith('Resolve: Blade Twirler')), 'escolheu antes de resolver: ' + s.log());
  const deck1 = s.e.pl[1].mainDeck.length;
  s.pick('B');
  drain(s);
  assert.equal(s.e.pl[1].mainDeck.length, deck1 - 1, s.log());
  // segundo movimento no turno: não dispara
  s.e.moveUnits([tw], BF1, 0);
  s.go();
  assert.ok(!/Blade Twirler/.test(s.d.prompt), s.d.prompt);
});

// ───────────────────────────── VEN-015 / VEN-020: tags ─────────────────────────────
test('Decree of Rage não tem tag e Twilight Reveler só tem Ionia (o corpus trazia o tipo como tag; conferido na arte)', () => {
  const s = new Scenario();
  const dr = s.put(0, 'VEN-015', 'hand');
  const tr = s.put(0, 'VEN-020', base(0));
  assert.equal(s.e.hasTag(dr, 'Spell'), false);
  assert.equal(s.e.hasTag(tr, 'Unit'), false);
  assert.equal(s.e.hasTag(tr, 'Ionia'), true);
});

// ───────────────────────────── VEN-013 Shadow Assassin ─────────────────────────────
test('Shadow Assassin: "your trash" é o descarte de quem a joga (Drakehound Packmaster joga cartas do oponente)', () => {
  const s = new Scenario();
  const sa = s.e.newObj('VEN-013', 1, 'setAside'); // dono: B
  sa.controller = 0; // jogada por A (o controlador é definido ao finalizar)
  const er = getScript('VEN-013')!.entersReady!;
  s.put(1, 'VEN-013', 'trash');
  assert.equal(er(s.e, sa), false, 'só o descarte do dono tem uma cópia');
  s.put(0, 'VEN-013', 'trash');
  assert.equal(er(s.e, sa), true);
});
