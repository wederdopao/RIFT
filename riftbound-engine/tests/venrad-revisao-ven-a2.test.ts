// Revisão independente do Vendetta, VEN-022..VEN-042: um teste por erro achado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';
import { getScript } from '../src/engine/script';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5
const SENTRY = 'OGN-096'; // Watchful Sentry: Deathknell — Draw 1

function drain(s: Scenario) {
  (s.e as any).runSync((s.e as any).drain());
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else if (s.d.prompt.startsWith('Distribuir dano')) s.ok([s.d.options[0].id]);
    else break;
  }
}

// ───────────────────────────── VEN-022 Endless Riches ─────────────────────────────
test('Endless Riches: morrendo junto com outras cartas, todas são banidas, inclusive ela mesma (370.4)', () => {
  const s = new Scenario();
  const u = s.put(0, UNIT, base(0));
  const er = s.put(0, 'VEN-022', base(0));
  const u2 = s.put(0, UNIT, base(0));
  s.go();
  s.e.killAll([er, u, u2]);
  assert.equal(er.zone, 'banish', 'a própria Endless Riches');
  assert.equal(u.zone, 'banish');
  assert.equal(u2.zone, 'banish', 'a que vinha depois dela na lista também (substituição vista antes de qualquer saída)');
});

test('Endless Riches: unidade sua banida em vez de ir para o descarte não morre (sem Deathknell, 808.1.d.1)', () => {
  const s = new Scenario();
  s.put(0, 'VEN-022', base(0));
  const sentry = s.put(0, SENTRY, base(0));
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.e.kill(sentry);
  drain(s);
  assert.equal(sentry.zone, 'banish');
  assert.equal(s.e.pl[0].hand.length, hand, 'Deathknell não resolve: ' + s.log());
  // carta do oponente vai para o descarte dele normalmente e o Deathknell vale
  const foe = s.put(1, SENTRY, base(1));
  s.go();
  const hand1 = s.e.pl[1].hand.length;
  s.e.kill(foe);
  drain(s);
  assert.equal(foe.zone, 'trash');
  assert.equal(s.e.pl[1].hand.length, hand1 + 1, s.log());
});

// ───────────────────────────── VEN-028 Mournful Witness ─────────────────────────────
test('Mournful Witness: atacante chamada de volta no empate também estava no combate (fica Empowered)', () => {
  const s = new Scenario();
  const w = s.put(0, 'VEN-028', base(0));
  const def = s.put(1, UNIT, BF0);
  s.e.bfs[0].controller = 1;
  s.go();
  s.e.stun(def, 0); // não causa dano de combate: os dois sobrevivem
  s.go();
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok([w.id]);
  if (s.d.prompt.startsWith('Para onde')) s.ok([s.d.options.find((o) => o.label !== 'Base' && !/base/i.test(o.label))!.id]);
  drain(s);
  assert.deepEqual(w.loc, base(0), 'chamada de volta: ' + s.log());
  assert.ok(w.empowered, s.log(30));
});

// ───────────────────────────── VEN-042 Shen ─────────────────────────────
test('Shen: conta as unidades suas aqui de verdade (hold "de conquista" do Skyfall lista só a unidade equipada)', () => {
  const s = new Scenario();
  const shen = s.put(0, 'VEN-042', BF0);
  s.put(0, UNIT, BF0);
  s.go();
  const hand = s.e.pl[0].hand.length;
  s.e.emit({ type: 'hold', player: 0, bf: 0, excess: 0, units: [shen.id], aliasOf: 'conquer' });
  drain(s);
  assert.equal(s.e.pl[0].hand.length, hand + 1, s.log());
});

// ───────────────────────────── VEN-029 Ol' Poro ─────────────────────────────
test("Ol' Poro: a restrição vale só nos três primeiros turnos do próprio jogador", () => {
  const s = new Scenario();
  const poro = s.put(1, 'VEN-029', 'hand');
  s.go();
  const cp = getScript('VEN-029')!.canPlay!;
  assert.equal(s.e.active, 0);
  s.e.pl[1].turns = 1;
  assert.ok(cp(s.e, poro, 1), 'no turno do oponente não há restrição');
  s.e.pl[0].turns = 3;
  assert.ok(!cp(s.e, poro, 0), 'no 3º turno dele, não');
  s.e.pl[0].turns = 4;
  assert.ok(cp(s.e, poro, 0));
});

// ───────────────────────────── VEN-034 Resonating Strike ─────────────────────────────
test('Resonating Strike: se o campo deixa de ser seu, o movimento não acontece mas a unidade ganha +2', () => {
  const s = new Scenario();
  const u = s.put(0, UNIT, base(0));
  s.put(1, UNIT, BF0);
  s.e.bfs[0].controller = 1; // o campo escolhido ficou ilegal antes de resolver
  s.go();
  const bfId = s.e.bfs[0].objId;
  const spell = s.put(0, 'VEN-034', 'hand');
  const item = { targetIds: [[bfId], [u.id]] } as any;
  // na resolução o motor passa só os alvos ainda legais: o campo saiu, a unidade ficou
  (s.e as any).runSync(getScript('VEN-034')!.spell!.resolve({ g: s.e, self: spell, p: 0, targets: [[], [u]], item, data: {}, rep: 0 }));
  assert.deepEqual(u.loc, base(0), s.log());
  assert.equal(s.e.might(u), 7, s.log());
});

// ───────────────────────────── VEN-040 Decree of Focus ─────────────────────────────
test('Decree of Focus: unidade escolhida pela execução do Repeat de um spell Fury inimigo vale', () => {
  const s = new Scenario();
  const u = s.put(0, UNIT, base(0));
  const fury = s.put(1, 'SFD-003', 'hand'); // Blood Rush (Fury, Repeat)
  s.go();
  fury.zone = 'chain';
  s.e.chain.push({ id: 'x', kind: 'spell', controller: 1, cardId: fury.id, targetIds: [[]], repeatIds: [[u.id]] } as any);
  const spec = (getScript('VEN-040')!.spell!.targets as any[])[0];
  const c = { g: s.e, self: s.put(0, 'VEN-040', 'hand'), p: 0, targets: [], data: {}, rep: 0 } as any;
  assert.ok(spec.filter(c, u));
});

// ───────────────────────────── VEN-024 Affectionate Poro ─────────────────────────────
test('Affectionate Poro: ferida, volta para a mão e é jogada de novo: é outro objeto, sem dano neste turno (124)', () => {
  const s = new Scenario();
  const poro = s.put(0, 'VEN-024', BF0);
  s.go();
  s.e.dealDamage(poro, 1, poro);
  s.e.returnToHand(poro);
  s.e.putOnBoard(poro, BF0, true);
  const hand = s.e.pl[0].hand.length;
  s.e.emit({ type: 'combatEnd', bf: 0, units: [poro.id], was: [poro.id] });
  drain(s);
  assert.equal(s.e.pl[0].hand.length, hand + 1, s.log());
});
