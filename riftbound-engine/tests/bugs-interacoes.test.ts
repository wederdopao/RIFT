// Bugs de interações menos comuns achados jogando (e a varredura que veio deles).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const MIND = 'OGN-089';

function endTurn(s: Scenario) {
  s.pick('Encerrar o turno');
  for (let i = 0; i < 40 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else break;
  }
}

test('Sprite Mother: o [Temporary] do texto é da ficha, não dela; no início do turno só o Sprite morre', () => {
  const s = new Scenario();
  s.put(0, 'OGN-106', 'hand');
  s.runes(0, Array(4).fill(MIND));
  s.go();
  s.pick('Jogar Sprite Mother');
  if (s.d.options.some((o) => o.label.includes('base de A'))) s.pick('base de A');
  s.passAll();
  const mom = s.e.units().find((u) => u.code === 'OGN-106')!;
  const sprite = s.e.units().find((u) => u.code === 'TOK-SPRITE')!;
  assert.ok(!s.e.kw(mom).temporary, 'Sprite Mother não tem Temporary');
  assert.ok(s.e.kw(sprite).temporary, 'o Sprite tem');
  endTurn(s); // turno de B
  endTurn(s); // volta para A: início do turno mata o Sprite
  assert.equal(sprite.zone === 'board', false, 'o Sprite expirou');
  assert.equal(mom.zone, 'board', 'a Sprite Mother continua viva');
});

test('Fiora, Victorious: sem estar Mighty não tem Deflect; Mighty, Deflect 1 (não 2)', () => {
  const s = new Scenario();
  const f = s.put(0, 'OGN-232', base(0));
  assert.ok(!s.e.kw(f).deflect, 'sem Mighty, sem Deflect');
  f.buffs = 1;
  assert.equal(s.e.kw(f).deflect, 1);
});

test("Spirit's Refuge: o gear não tem Deflect; só as unidades aliadas com Buff", () => {
  const s = new Scenario();
  const refuge = s.put(0, 'OGN-063', base(0));
  const u = s.put(0, 'OGN-087', BF0);
  assert.ok(!s.e.kw(refuge).deflect, 'o gear não tem Deflect');
  assert.ok(!s.e.kw(u).deflect);
  u.buffs = 1;
  assert.equal(s.e.kw(u).deflect, 1);
});

test('Gold: dá para ativar à mão ("Kill this, [Tap]: [Add] [A]"); conta como habilidade de gear (Prize of Progress)', () => {
  const s = new Scenario();
  const e = s.e;
  const pp = s.put(0, 'SFD-075', base(0)); // Prize of Progress, Might 3
  const g = e.createToken('TOK-GOLD', 0, base(0), true);
  s.go();
  const opt = s.d.options.find((o) => o.obj === g.id);
  assert.ok(opt, 'a Gold aparece como habilidade ativável');
  s.ok([opt!.id]);
  for (let i = 0; i < 10 && s.d.kind !== 'action'; i++) s.pick(/Passar|Sim/);
  assert.equal(g.zone === 'board', false, 'a Gold morreu (custo)');
  assert.equal(e.pl[0].pool.power.any || 0, 1, '[A] no pool');
  assert.equal(e.might(pp), 4, '+1 do Prize of Progress');
});

test('Gold no pagamento automático continua contando uma vez só (sem virar duas fontes)', () => {
  const s = new Scenario();
  const e = s.e;
  e.createToken('TOK-GOLD', 0, base(0), true);
  s.go();
  assert.equal(e.canPay(0, { energy: 0, power: [['Fury'], ['Fury']] } as any), false, 'uma Gold paga só um power');
  assert.equal(e.canPay(0, { energy: 0, power: [['Fury']] } as any), true);
});
