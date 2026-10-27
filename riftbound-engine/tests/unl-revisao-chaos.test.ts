// Revisão independente do lote chaos do Unleashed (UNL-121..UNL-150).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const BF1 = { t: 'bf', i: 1 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const C = RUNE.chaos;

/** Responde "não" a perguntas de sim/não e passa a prioridade até voltar à decisão de ação. */
function settle(s: Scenario, yes = false, hook?: (s: Scenario) => boolean) {
  for (let i = 0; i < 40 && !s.d.root; i++) {
    if (hook && hook(s)) continue;
    if (s.d.kind === 'confirm') s.pick(yes ? 'Sim' : 'Não');
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
}
function moveTo(s: Scenario, unitIds: string[], dest: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(dest);
}
/** Syndra no campo A em combate contra uma unidade inimiga; passa até p0 poder jogar `label`. */
function syndraShowdown(s: Scenario, label: string) {
  const sy = s.put(0, 'UNL-146', base(0));
  s.put(1, 'OGN-142', BF0);
  s.go();
  moveTo(s, [sy.id], 'Campo Vazio A');
  for (let i = 0; i < 10 && !(s.d.player === 0 && s.d.options.some((o) => o.label.includes(label))); i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else s.ok([s.d.options[0].id]);
  }
  return sy;
}

// ───────────── Syndra, Transcendent: Repeat dado a spells com escolhas por execução ─────────────
test("Syndra + Emperor's Divide: cada execução do Repeat escolhe o próprio campo (820.2.a)", () => {
  const s = new Scenario();
  const a = s.put(0, 'OGN-175', BF0);
  const b = s.put(0, 'OGN-175', BF1);
  s.put(0, 'SFD-043', 'hand');
  s.runes(0, [...Array(8).fill(C), ...Array(4).fill(RUNE.calm)]);
  syndraShowdown(s, "Jogar Emperor's Divide");
  s.pick("Jogar Emperor's Divide");
  let bfAsk = 0;
  for (let i = 0; i < 20 && !s.d.root; i++) {
    const d = s.d;
    if (/Repeat/.test(d.prompt)) s.pick('Sim');
    else if (/qual campo/.test(d.prompt)) s.pick(bfAsk++ === 0 ? 'Campo Vazio A' : 'Campo Vazio B');
    else if (/quais unidades suas/.test(d.prompt)) s.ok(d.options.filter((o) => o.obj === a.id || o.obj === b.id).map((o) => o.id));
    else if (d.kind === 'priority' || d.kind === 'focus') break;
    else s.ok([d.options[0].id]);
  }
  assert.equal(bfAsk, 2);
  assert.deepEqual(a.loc, base(0), 'a 1ª execução (Campo A) também move: ' + s.log(10));
  assert.deepEqual(b.loc, base(0));
});

// ───────────── Baron Nashor: Limpeza Especial de Combate ─────────────
test('Baron Nashor morre no combate: a aliada que só ficaria com dano letal sem o +2 dele sobrevive (323.4, 466.1.a)', () => {
  const s = new Scenario();
  const e = s.e;
  const baron = s.put(0, 'UNL-147', base(0));
  const ally = s.put(0, 'OGN-175', base(0)); // 3 (+2 do Baron = 5)
  const drake = s.put(1, 'OGN-142', BF0); // 10
  s.put(1, 'OGN-175', BF0); // 3
  s.go();
  e.giveMight(drake, 2); // defensores: 12 + 3 = 15 → 12 no Baron, 3 na aliada
  assert.equal(e.might(ally), 5);
  moveTo(s, [baron.id, ally.id], 'Campo Vazio A');
  settle(s, false, (s) => {
    if (s.d.player === 1 && /Distribuir dano/.test(s.d.prompt)) {
      s.pickObj(baron);
      return true;
    }
    return false;
  });
  assert.notEqual(baron.zone, 'board', s.log(20));
  assert.equal(ally.zone, 'board', 'a aliada tinha 3 de dano e 5 de Might quando a limpeza a conferiu: ' + s.log(20));
  assert.equal(ally.damage, 0);
});

test('Baron Nashor: com o Baron Pit já na mesa, entra no local escolhido (riftboundfaq.com, Baron Nashor)', () => {
  const s = new Scenario();
  const e = s.e;
  const pit = e.createBattlefield('TOK-BARONPIT', 1);
  s.put(0, 'OGN-175', BF0);
  s.put(0, 'UNL-147', 'hand');
  s.runes(0, Array(13).fill(C));
  s.go();
  s.pick('Jogar Baron Nashor');
  s.pick('Campo Vazio A');
  settle(s);
  const baron = e.units().find((u) => u.code === 'UNL-147')!;
  assert.equal(e.bfs.length, 3, 'não cria outro Pit');
  assert.deepEqual(baron.loc, BF0);
  assert.equal(pit, 2);
});

test('Bone Skewer: a unidade forçada pode pagar o Accelerate de graça e entra pronta, mas atordoada (riftboundfaq.com, Bone Skewer)', () => {
  const s = new Scenario();
  const e = s.e;
  const root = s.put(1, 'UNL-127', 'hand'); // Mister Root, Accelerate
  s.put(0, 'UNL-139', 'hand');
  s.runes(0, [C, C, C]);
  s.go();
  s.pick('Jogar Bone Skewer');
  s.pick('Campo Vazio B');
  settle(s, false, (s) => {
    if (/Bone Skewer: escolha uma unidade/.test(s.d.prompt)) s.pickObj(root);
    else if (/Accelerate/.test(s.d.prompt)) s.pick('Sim', 1);
    else return false;
    return true;
  });
  assert.equal(root.zone, 'board', s.log(20));
  assert.deepEqual(root.loc, BF1);
  assert.equal(root.exhausted, false);
  assert.equal(root.stunned, true);
  assert.equal(e.runesOf(1).length, 0);
});

test('Syndra + Heedless Resurrection com Repeat: a unidade morta tem de cobrir os alvos das duas execuções (355.16)', () => {
  const s = new Scenario();
  const rookie = s.put(0, 'OGN-136', base(0)); // custa 2
  s.put(0, 'OGN-175', base(0)); // Shipyard Skulker, custa 3
  const t3 = s.put(0, 'OGN-175', 'trash'); // custa 3
  const t2 = s.put(0, 'OGN-136', 'trash'); // custa 2
  s.put(0, 'UNL-142', 'hand');
  s.runes(0, Array(10).fill(C));
  syndraShowdown(s, 'Jogar Heedless Resurrection');
  s.pick('Jogar Heedless Resurrection');
  let killOpts: string[] | undefined;
  let tAsk = 0;
  for (let i = 0; i < 20 && !s.d.root && !killOpts; i++) {
    const d = s.d;
    if (/Repeat/.test(d.prompt)) s.pick('Sim');
    else if (/jogar qual unidade do seu descarte/.test(d.prompt)) s.pickObj(tAsk++ === 0 ? t3 : t2);
    else if (/matar qual unidade aliada/.test(d.prompt)) killOpts = d.options.map((o) => o.obj ?? o.id);
    else s.ok([d.options[0].id]);
  }
  assert.ok(killOpts, s.log(10));
  assert.equal(tAsk, 2);
  assert.ok(!killOpts!.includes(rookie.id), 'matar a de custo 2 deixaria ilegal o alvo de custo 3 da 1ª execução');
});
