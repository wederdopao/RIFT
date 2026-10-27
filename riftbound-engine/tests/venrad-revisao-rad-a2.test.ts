// Revisão independente do Radiance, intervalo RAD-022..RAD-042: um teste por erro achado (e alguns de confirmação).
// Rodar: node --import tsx --test tests/venrad-revisao-rad-a2.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const rs = (code: string, n: number) => Array.from({ length: n }, () => code);

function drain(s: Scenario) {
  for (let i = 0; i < 40 && s.g.current; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}

// ───────────────────────────── RAD-032 Battle Preparations ─────────────────────────────
test('Battle Preparations: o jogador escolhe quais runas preparar (alvos escolhidos ao jogar, 355.10.f)', () => {
  const s = new Scenario();
  s.put(0, 'RAD-024', BF0); // Blossoming Dreamroot (gear aliado para o Show Off)
  const u = s.put(0, 'OGN-001', base(0));
  s.runes(0, rs(RUNE.calm, 2)); // pagam o [2]
  const f1 = s.put(0, RUNE.fury, base(0), { ready: false });
  const f2 = s.put(0, RUNE.fury, base(0), { ready: false });
  const ch = s.put(0, RUNE.chaos, base(0), { ready: false });
  s.put(0, 'RAD-032', 'hand');
  s.go();
  s.pick('Jogar Battle Preparations');
  s.pick('Sim'); // Show Off
  if (/qual carta/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
  s.maybeObj(u); // unidade (+2)
  assert.match(s.d.prompt, /runas/i, 'pergunta as runas ao jogar: ' + s.d.prompt);
  s.ok([f2.id, ch.id]);
  drain(s);
  assert.equal(f2.exhausted, false, s.log());
  assert.equal(ch.exhausted, false, s.log());
  assert.equal(f1.exhausted, true, 'a runa não escolhida continua exaurida');
  assert.equal(s.e.might(u), 5 + 2);
});

test('Battle Preparations: sem Show Off não prepara runas', () => {
  const s = new Scenario();
  s.put(0, 'RAD-024', BF0);
  const u = s.put(0, 'OGN-001', base(0));
  s.runes(0, rs(RUNE.calm, 2));
  const f1 = s.put(0, RUNE.fury, base(0), { ready: false });
  s.put(0, 'RAD-032', 'hand');
  s.go();
  s.pick('Jogar Battle Preparations');
  s.pick('Não');
  s.maybeObj(u);
  drain(s);
  assert.equal(f1.exhausted, true, s.log());
  assert.equal(s.e.might(u), 5 + 2);
});

// ───────────────────────────── RAD-034 Hunker Down ─────────────────────────────
test('Hunker Down: "It can\'t move this turn" proíbe qualquer jogador, mesmo após um "só ele não pode" (Vex)', () => {
  const s = new Scenario();
  const u = s.put(0, 'OGN-001', BF0);
  u.exhausted = true;
  // restrição antiga de outro efeito (Vex, Apathetic): só o jogador 0 não podia movê-la
  u.noMoveTurn = s.e.turn;
  u.noMoveBy = 0;
  s.put(0, 'RAD-034', 'hand');
  s.runes(0, rs(RUNE.calm, 1));
  s.go();
  s.pick('Jogar Hunker Down');
  s.maybeObj(u);
  drain(s);
  assert.equal(u.exhausted, false, s.log());
  assert.equal(s.e.cantMoveBy(u, 0), true);
  assert.equal(s.e.cantMoveBy(u, 1), true, 'o oponente também não pode movê-la (spell/habilidade dele)');
});

// ───────────────────────────── RAD-033 Command: Attack ─────────────────────────────
test('Command: Attack: um gear com Deploy que também é unidade (unit gear) se move como unidade', () => {
  const s = new Scenario();
  const root = s.put(0, 'RAD-024', BF0); // Blossoming Dreamroot [Deploy]
  const lady = s.put(0, 'OGN-001', base(0));
  s.e.makeUnitGear(root, lady, 2);
  assert.ok(s.e.isUnit(root));
  s.put(0, 'RAD-033', 'hand');
  s.runes(0, rs(RUNE.calm, 2));
  s.go();
  let moved = 0;
  const orig = s.e.emit.bind(s.e);
  (s.e as any).emit = (ev: any) => {
    if (ev.type === 'move' && ev.unit?.id === root.id) moved++;
    return orig(ev);
  };
  s.pick('Jogar Command: Attack');
  s.pick('Mover');
  s.maybeObj(root);
  drain(s);
  assert.deepEqual(root.loc, BF1, s.log());
  assert.equal(moved, 1, 'emite o evento de movimento de unidade');
  assert.equal(s.e.bfs[1].controller, 0, 'a unidade que chega disputa e conquista o campo vazio');
});

// ───────────────────────────── confirmações ─────────────────────────────
test('Entrenched Boar: escolhe entrar pronta e então não pode se mover neste turno', () => {
  const s = new Scenario();
  s.put(0, 'RAD-026', 'hand');
  s.runes(0, rs(RUNE.calm, 2));
  s.go();
  s.pick('Jogar Entrenched Boar');
  s.pick('Sim');
  if (/onde/i.test(s.d.prompt)) s.pick('base');
  drain(s);
  const boar = s.e.units().find((o) => o.code === 'RAD-026')!;
  assert.equal(boar.exhausted, false, s.log());
  assert.equal(s.e.cantMoveBy(boar, 0), true);
  assert.equal(s.e.movableUnits(0).includes(boar), false);
});

test('Entrenched Boar: recusando, entra exaurida e pode se mover depois', () => {
  const s = new Scenario();
  s.put(0, 'RAD-026', 'hand');
  s.runes(0, rs(RUNE.calm, 2));
  s.go();
  s.pick('Jogar Entrenched Boar');
  s.pick('Não');
  if (/onde/i.test(s.d.prompt)) s.pick('base');
  drain(s);
  const boar = s.e.units().find((o) => o.code === 'RAD-026')!;
  assert.equal(boar.exhausted, true, s.log());
  assert.equal(s.e.cantMoveBy(boar, 0), false);
});

test('Ziggs, Short-Fused: a habilidade da Bomb (gear aliado) causa 1 de Bonus Damage', () => {
  const s = new Scenario();
  s.put(0, 'RAD-023', BF1);
  const bomb = s.e.createToken('TOK-BOMB', 0, BF0);
  const foe = s.put(1, 'RAD-036', BF0); // Storm Raptor 6
  s.go();
  s.e.killAll([bomb]);
  s.e.runSync(s.e.drain());
  drain(s);
  assert.equal(foe.damage, 3, s.log());
});

test('Storm Raptor: unidade inimiga atordoada que morre aqui compra 1; não atordoada, não', () => {
  const s = new Scenario();
  s.put(0, 'RAD-036', BF0);
  const a = s.put(1, 'OGN-001', BF0);
  const b = s.put(1, 'OGN-001', BF0);
  s.go();
  a.stunned = true;
  const h0 = s.e.pl[0].hand.length;
  s.e.killAll([a]);
  s.e.runSync(s.e.drain());
  drain(s);
  assert.equal(s.e.pl[0].hand.length, h0 + 1, s.log());
  s.e.killAll([b]);
  s.e.runSync(s.e.drain());
  drain(s);
  assert.equal(s.e.pl[0].hand.length, h0 + 1, s.log());
});

test('Hush: anula um spell com custo de Power de 2 ou mais; um de Power 1 não é alvo', () => {
  const s = new Scenario();
  const foe = s.put(1, 'OGN-001', base(1));
  s.put(0, 'OGN-029', 'hand'); // Falling Star: [2] + 2 Fury
  s.put(0, 'OGN-043', 'hand'); // Charm: [1] + 1 Calm
  s.runes(0, [...rs(RUNE.fury, 4), RUNE.calm, RUNE.calm]);
  s.put(1, 'RAD-041', 'hand');
  s.runes(1, rs(RUNE.calm, 3));
  s.go();
  // Charm (Power 1): o oponente não tem como jogar Hush nele
  s.pick('Jogar Charm');
  s.maybeObj(foe);
  for (let i = 0; i < 10 && s.g.current && !s.d.root; i++) {
    if (s.d.player === 1) assert.ok(!s.d.options.some((o) => o.label.includes('Hush')), 'Hush não pode anular Charm');
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  assert.ok(s.e.log.some((l) => /Charm/.test(l.text) && /Resolve/.test(l.text)), s.log());
  // Falling Star (Power 2): Hush anula
  s.pick('Jogar Falling Star');
  while (!s.d.root && s.d.player === 0 && s.d.kind !== 'priority') s.ok([s.d.options[0].id]);
  assert.equal(s.d.player, 1, s.d.prompt);
  s.pick('Jogar Hush');
  if (!s.d.root && /Hush/.test(s.d.prompt)) s.ok([s.d.options[0].id]);
  drain(s);
  assert.ok(s.e.log.some((l) => /anulad|counter/i.test(l.text)), s.log());
  assert.equal(foe.damage, 0, s.log());
  assert.equal(foe.zone, 'board');
});

test('Sanctum Conservator: jogar uma carta de custo [7]+ a prepara', () => {
  const s = new Scenario();
  const sc = s.put(0, 'RAD-030', base(0));
  sc.exhausted = true;
  s.put(0, 'RAD-040', 'hand'); // Heartening Soul, [7]
  s.runes(0, rs(RUNE.calm, 8));
  s.go();
  s.pick('Jogar Heartening Soul');
  for (let i = 0; i < 10 && s.g.current && !s.d.root; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (/onde/i.test(s.d.prompt)) s.pick('base');
    else s.ok([s.d.options[0].id]);
  }
  assert.equal(sc.exhausted, false, s.log());
});
