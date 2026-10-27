// Revisão independente do Vendetta, VEN-064..VEN-083: um teste por erro achado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);
const MIND = 'OGN-089';
const UNIT = 'OGN-001'; // Blazing Scorcher 5/5
const GEAR = 'OGN-228'; // Vanguard Helm

function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}

// ───────────── VEN-065 Swain, Visionary ─────────────
test('Swain, Visionary: um unit gear jogado conta como unidade e como gear (RiftJudge #11866)', () => {
  const s = new Scenario();
  const g = s.e;
  const swain = s.put(0, 'VEN-065', BF0);
  const pb = s.put(0, 'VEN-058', base(0)); // Patched Porobot (Unit Gear)
  const spell = s.put(0, 'VEN-072', 'trash'); // Guttural Roar
  const t = g.script(swain).triggers![0];
  const ev = { type: 'conquer', player: 0, bf: 0, units: [swain.id] } as any;
  g.pl[0].played = [pb.id];
  assert.equal(t.cond!(g.ctx(swain, 0), ev), false, 'sem spell não pontua');
  g.pl[0].played = [pb.id, spell.id];
  assert.equal(t.cond!(g.ctx(swain, 0), ev), true, 'Porobot + spell bastam');
});

// ───────────── VEN-066 Temporal Breach ─────────────
test('Temporal Breach: unidade do oponente na base de quem a tomou fica banida (FAQ oficial do Vendetta)', () => {
  const s = new Scenario();
  const u = s.put(1, UNIT, base(0));
  u.controller = 0; // tomada (Hostile Takeover) e movida para a base de A
  s.put(0, 'VEN-066', 'hand');
  s.runes(0, rs(MIND, 3));
  s.go();
  s.pick('Jogar Temporal Breach');
  s.maybeObj(u);
  drain(s);
  assert.equal(u.zone, 'banish', s.log());
});

test('Temporal Breach: no caso normal o dono a joga de novo no mesmo campo, ignorando o custo', () => {
  const s = new Scenario();
  const u = s.put(1, UNIT, BF0);
  s.put(0, 'VEN-066', 'hand');
  s.runes(0, rs(MIND, 3));
  s.go();
  s.pick('Jogar Temporal Breach');
  s.maybeObj(u);
  drain(s);
  assert.equal(u.zone, 'board', s.log());
  assert.deepEqual(u.loc, BF0);
  assert.equal(u.controller, 1);
});

// ───────────── VEN-067 Bottled Constellation ─────────────
test('Bottled Constellation: matar as 3 é custo, pago ao pôr o gatilho na pilha (383.3.b)', () => {
  const s = new Scenario();
  s.put(1, 'VEN-067', base(1));
  const gs = [s.put(1, GEAR, base(1)), s.put(1, GEAR, base(1)), s.put(1, GEAR, base(1))];
  const spare = s.put(1, GEAR, base(1));
  s.go();
  s.pick('Encerrar o turno');
  for (let i = 0; i < 40 && !/Matar 3 outras/.test(s.d.prompt); i++) {
    assert.ok(!(s.d.kind === 'action' && s.d.root), 'o gatilho não foi oferecido: ' + s.log());
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok(s.d.options.slice(0, Math.max(1, s.d.min)).map((o) => o.id));
  }
  s.pick('Sim');
  const pts = s.e.pl[1].points;
  s.ok(gs.map((x) => x.id));
  drain(s);
  assert.ok(gs.every((x) => x.zone !== 'board'), s.log());
  assert.equal(spare.zone, 'board');
  assert.equal(s.e.pl[1].points, pts + 1, s.log());
  // as 3 morrem antes de o gatilho ir para a pilha (custo), não na resolução
  const txt = s.e.log.map((l) => l.text);
  const lastKill = txt.lastIndexOf('Vanguard Helm é sacrificada.');
  const onChain = txt.findIndex((t) => t.startsWith('Na pilha: Bottled Constellation'));
  assert.ok(lastKill >= 0 && onChain > lastKill, s.log());
});

// ───────────── VEN-075 Platewyrm Egg ─────────────
test('Platewyrm Egg Empowered adiciona [2] também no pagamento automático', () => {
  const s = new Scenario();
  const egg = s.put(0, 'VEN-075', base(0));
  s.e.empowerObj(egg, 0);
  const demo = s.put(0, 'VEN-080', 'hand'); // Noxian Demolitionist: [2]
  s.go();
  s.pick('Jogar Noxian Demolitionist');
  if (/onde\?/.test(s.d.prompt)) s.pick('base');
  drain(s);
  assert.equal(demo.zone, 'board', s.log());
  assert.equal(egg.exhausted, true);
});

// ───────────── VEN-079 Dame the Despoiler ─────────────
test('Dame the Despoiler: se a unidade escolhida fica ilegal, o +1 [Might] ainda vale (359.3.e.5-7)', () => {
  const s = new Scenario();
  const g = s.e;
  const dame = s.put(0, 'VEN-079', BF0);
  g.empowerObj(dame, 0);
  const t = g.script(dame).triggers![0];
  assert.ok(t.alwaysResolve);
  const m0 = g.might(dame);
  const c = g.ctx(dame, 0);
  c.targets = [[]];
  g.runSync(t.resolve(c));
  assert.equal(g.might(dame), m0 + 1);
});

// ───────────── VEN-082 Profiteer × Kayle ─────────────
test('Profiteer: desempoderar Kayle (3 status) tira só um; e pode empoderá-la de novo (FAQ oficial do Vendetta)', () => {
  const s = new Scenario();
  const g = s.e;
  const kayle = s.put(0, 'VEN-134', base(0));
  for (let k = 0; k < 3; k++) g.empowerObj(kayle, 0, 3);
  assert.equal(g.empowerCount(kayle), 3);
  s.put(0, 'VEN-082', 'hand');
  s.runes(0, rs(RUNE.body, 4));
  s.go();
  s.pick('Jogar Profiteer');
  if (/onde\?/.test(s.d.prompt)) s.pick('base');
  drain(s);
  if (s.d.kind === 'confirm' || /Profiteer/.test(s.d.prompt)) s.pick('Sim');
  s.maybeObj(kayle); // desempoderar (custo): só um dos 3 status sai
  drain(s);
  s.maybeObj(kayle); // empoderar (na resolução): Kayle com 2 pode ganhar o 3º
  drain(s);
  assert.match(s.log(), /perde um status Empowered \(fica com 2\)/);
  assert.equal(g.empowerCount(kayle), 3, s.log());
});

// ───────────── VEN-083 Rampage ─────────────
test('Rampage: com a inimiga ilegal, a aliada ainda ganha +2 se o custo foi pago (359.3.e.5-6)', () => {
  const s = new Scenario();
  const g = s.e;
  const mine = s.put(0, UNIT, BF0);
  const rp = s.put(0, 'VEN-083', 'trash');
  const c = g.ctx(rp, 0);
  c.data.paid = true;
  c.targets = [[mine], []];
  const m0 = g.might(mine);
  g.runSync(g.script(rp).spell!.resolve(c));
  assert.equal(g.might(mine), m0 + 2);
  assert.equal(mine.damage, 0);
});

// ───────────── VEN-077 Tools of Empire ─────────────
test('Tools of Empire não tem tag (o dado tinha "Gear")', () => {
  const s = new Scenario();
  const t = s.put(0, 'VEN-077', base(0));
  assert.equal(s.e.hasTag(t, 'Gear'), false);
});
