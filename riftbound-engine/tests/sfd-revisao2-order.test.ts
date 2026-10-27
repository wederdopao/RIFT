// Revisão independente (2ª) do lote "order" do Spiritforged (SFD-151 a SFD-180). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import type { Obj, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;

/** Mata as unidades ao mesmo tempo (uma ação, 370.1.a.2), respondendo às escolhas de substituição com `choose`. */
function killTogether(s: Scenario, us: Obj[], choose: (labels: string[]) => number) {
  const gen = s.e.killG(us);
  let r = gen.next(undefined as any);
  const prompts: string[] = [];
  while (!r.done) {
    const d = r.value!;
    prompts.push(d.options.map((o) => o.label).join(' | '));
    r = gen.next([d.options[choose(d.options.map((o) => o.label))].id]);
  }
  return prompts;
}

// Regra 373.2 (exemplo do próprio texto): Soraka com Guardian Angel morre junto com dois Recruits no campo e dois na
// base. Cada substituição só se aplica numa sequência ininterrupta.
function sorakaScene() {
  const s = new Scenario();
  const sor = s.put(0, 'SFD-173', BF0);
  const ga = s.put(0, 'SFD-051', base(0));
  s.e.attach(ga, sor, 0);
  const atBf = [s.e.createToken('TOK-RECRUIT', 0, BF0, true), s.e.createToken('TOK-RECRUIT', 0, BF0, true)];
  const atBase = [s.e.createToken('TOK-RECRUIT', 0, base(0), true), s.e.createToken('TOK-RECRUIT', 0, base(0), true)];
  s.go();
  return { s, sor, ga, atBf, atBase };
}

test('Soraka + Guardian Angel: o Guardian Angel primeiro → Soraka (já na base) salva os Recruits da base (373.2)', () => {
  const { s, sor, ga, atBf, atBase } = sorakaScene();
  killTogether(s, [sor, ...atBf, ...atBase], (ls) => Math.max(0, ls.findIndex((l) => /Guardian Angel/.test(l))));
  assert.equal(sor.zone, 'board');
  assert.deepEqual(sor.loc, base(0));
  assert.equal(ga.zone, 'trash');
  assert.ok(atBf.every((r) => r.zone !== 'board'), 'os do campo morrem');
  assert.ok(atBase.every((r) => r.zone === 'board' && r.exhausted), 'os da base são salvos');
});

test('Soraka + Guardian Angel: Soraka primeiro salva os dois do campo; depois não salva os da base (373.2)', () => {
  const { s, sor, atBf, atBase } = sorakaScene();
  const prompts = killTogether(s, [sor, ...atBf, ...atBase], (ls) => Math.max(0, ls.findIndex((l) => /chamar de volta/.test(l))));
  assert.equal(prompts.length, 1, 'a sequência de Soraka continua sozinha no outro Recruit do campo: ' + prompts.join(' // '));
  assert.equal(sor.zone, 'board', 'o Guardian Angel salva Soraka');
  assert.ok(atBf.every((r) => r.zone === 'board' && r.loc?.t === 'base'), 'os do campo são salvos');
  assert.ok(atBase.every((r) => r.zone !== 'board'), 'a substituição de Soraka já foi usada: os da base morrem');
});

test('Soraka morrendo junto ainda salva as aliadas menores do mesmo local (370.4)', () => {
  const s = new Scenario();
  const sor = s.put(0, 'SFD-173', BF0);
  const rs = [s.e.createToken('TOK-RECRUIT', 0, BF0, true), s.e.createToken('TOK-RECRUIT', 0, BF0, true)];
  s.go();
  killTogether(s, [sor, ...rs], () => 0);
  assert.equal(sor.zone, 'trash');
  assert.ok(rs.every((r) => r.zone === 'board' && r.exhausted && r.loc?.t === 'base'));
});
