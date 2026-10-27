// Revisão independente do Unleashed, lote body (UNL-091..UNL-120): um teste por erro achado. Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const B = RUNE.body;
const A = 'Campo Vazio A';

/** Passa pilha/showdown; `on` responde perguntas pelo trecho do enunciado. */
function drive(s: Scenario, on: Record<string, string> = {}, max = 40) {
  for (let i = 0; i < max && s.g.current; i++) {
    const k = Object.keys(on).find((x) => s.d.prompt.includes(x));
    if (k && !s.d.root) s.pick(on[k]);
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Distribuir dano') || s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}

function moveTo(s: Scenario, unitIds: string[], bfLabel: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(bfLabel);
}

// ── Revisão 2 (interações conferidas; sem erro achado — ficam como regressão) ──

test("Repulse anula o gatilho de ataque do Kha'Zix (habilidade inimiga que escolhe só a minha unidade); o XP gasto não volta", () => {
  const s = new Scenario();
  s.e.pl[0].xp = 3;
  const k = s.put(0, 'UNL-119', base(0));
  const foe = s.put(1, 'OGN-142', BF0);
  s.put(1, 'UNL-106', 'hand');
  s.runes(1, [B, B]);
  s.go();
  moveTo(s, [k.id], A);
  s.pick('Sim');
  s.maybeObj(foe);
  assert.equal(s.d.player, 1, s.d.prompt);
  s.pick('Jogar Repulse');
  s.maybeObj(foe);
  drive(s);
  assert.ok(s.e.log.some((l) => l.text.includes('foi anulado')), s.log(15));
  assert.ok(!s.e.log.some((l) => l.text.includes("Mountain Drake recebe 5 de dano de Kha'Zix")), s.log(15));
  assert.equal(s.e.pl[0].xp, 0); // custo pago ao finalizar (383.3.b.1)
});

test('Elder Dragon × Clash of Giants: o dano da minha unidade é meu (letal); entre duas inimigas o dano é delas (417.6.b.4)', () => {
  const s = new Scenario();
  s.put(0, 'UNL-118', base(0));
  const mine = s.put(0, 'OGN-136', base(0)); // 2
  const foe = s.put(1, 'OGN-142', BF0); // 10
  const foe2 = s.put(1, 'OGN-142', BF1); // 10
  const foe3 = s.put(1, 'UNL-105', BF1); // 5
  s.put(0, 'UNL-110', 'hand');
  s.put(0, 'UNL-110', 'hand');
  s.runes(0, Array(16).fill(B));
  s.go();
  s.pick('Jogar Clash of Giants');
  s.pickObj(mine);
  s.pickObj(foe);
  drive(s);
  assert.equal(foe.zone, 'trash', s.log(10)); // 2 de dano meu numa unidade de 10: letal pelo Elder Dragon
  s.pick('Jogar Clash of Giants');
  s.pickObj(foe2);
  s.pickObj(foe3);
  drive(s);
  assert.equal(foe2.zone, 'board', s.log(10)); // 5 de dano de uma unidade dele: regra normal
  assert.equal(foe2.damage, 5);
  assert.equal(foe3.zone, 'trash');
});

test('Grim Resolve como Action no combate do oponente: o defensor que vence dá 2 XP', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-136', BF0);
  const foe = s.put(1, 'OGN-136', base(1));
  s.put(0, 'UNL-095', 'hand');
  s.runes(0, [B, B]);
  s.go();
  s.pick('Encerrar o turno');
  drive(s);
  moveTo(s, [foe.id], A);
  for (let i = 0; i < 6 && s.d.player !== 0; i++) s.pick('Passar');
  s.pick('Jogar Grim Resolve');
  s.maybeObj(mine);
  drive(s);
  assert.equal(foe.zone, 'trash', s.log(15));
  assert.equal(s.e.pl[0].xp, 2, s.log(15));
});

test('Call to Battle: a unidade do oponente que entra no meu campo o disputa — ele é o atacante (464.2.c.1)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-136', base(0));
  s.put(0, 'OGN-136', BF0);
  s.put(1, 'UNL-099', base(1)); // Towering Combatant: Shield 2 só como defensor
  s.put(0, 'UNL-101', 'hand');
  s.runes(0, [B, B, B]);
  s.go();
  s.pick('Jogar Call to Battle');
  drive(s);
  assert.ok(s.e.log.some((l) => l.text.includes('Combate em Campo Vazio A: B ataca, A defende')), s.log(15));
  assert.ok(s.e.log.some((l) => l.text.includes('Dano de combate: B 3 × 4 A')), s.log(15));
});

test('Call to Battle: o oponente não pode escolher uma unidade que ele está proibido de mover (Vex, Apathetic)', () => {
  const s = new Scenario();
  const mine = s.put(0, 'OGN-136', base(0));
  s.put(0, 'OGN-136', BF0); // controlo o campo A
  const locked = s.put(1, 'OGN-136', base(1));
  const free = s.put(1, 'OGN-142', base(1));
  // "Ele não pode movê-la neste turno" (Vex, Apathetic): o próprio dono não pode mover esta unidade
  locked.noMoveTurn = s.e.turn;
  locked.noMoveBy = 1;
  s.put(0, 'UNL-101', 'hand');
  s.runes(0, [B, B, B]);
  s.go();
  s.pick('Jogar Call to Battle');
  // só uma unidade dele pode ir: a escolha é automática e a outra fica
  assert.ok(s.e.log.some((l) => l.text.includes('Mountain Drake → Campo Vazio A')), s.log(10));
  assert.deepEqual(mine.loc, BF0);
  assert.deepEqual(locked.loc, base(1));
  void free;
});

test('Rengar, Trophy Hunter: jogado por efeito sem local fixo (Dazzling Aurora) pode ir para um campo com inimigas (RiftJudge #11535)', () => {
  const s = new Scenario();
  s.put(0, 'OGN-160', base(0)); // Dazzling Aurora
  s.put(1, 'OGN-136', BF0); // campo A do oponente, com unidade dele
  const r = s.put(0, 'UNL-120', 'deckTop');
  s.go();
  s.pick('Encerrar o turno');
  drive(s);
  assert.match(s.d.prompt, /Jogar Rengar.*onde/, s.log(10));
  assert.ok(s.d.options.some((o) => o.label === A), s.d.options.map((o) => o.label).join(' | '));
  s.pick(A);
  drive(s);
  assert.deepEqual(r.loc, BF0, s.log(10));
});

test('Nidalee, Cat Form: jogada por efeito sem local fixo pode ir (Ambush) para um campo onde tenho unidades sem controlá-lo', () => {
  const s = new Scenario();
  s.put(0, 'OGN-160', base(0)); // Dazzling Aurora
  s.put(1, 'OGN-136', BF0); // campo A controlado pelo oponente
  s.put(0, 'OGN-136', BF0); // e uma unidade minha lá (campo disputado)
  s.e.bfs[0].controller = 1;
  s.put(0, 'UNL-114', 'deckTop');
  s.go();
  s.pick('Encerrar o turno');
  drive(s);
  assert.match(s.d.prompt, /Jogar Nidalee.*onde/, s.log(10));
  assert.ok(s.d.options.some((o) => o.label === A), s.d.options.map((o) => o.label).join(' | '));
});
