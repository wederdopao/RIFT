// Segunda revisão independente do lote "fury" do Spiritforged (SFD-001..SFD-030). Rodar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { Decision, P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;

function moveTo(s: Scenario, unitIds: string[], dest: string) {
  s.pick('Mover unidades');
  if (s.d.prompt.startsWith('Quais unidades')) s.ok(unitIds);
  if (s.d.prompt.startsWith('Para onde')) s.pick(dest);
}
/** Avança passando a prioridade/Focus; `other` responde as demais decisões (undefined = parar). */
function run(s: Scenario, other?: (d: Decision) => string[] | undefined, max = 80) {
  for (let i = 0; i < max && s.g.current && s.d.kind !== 'action'; i++) {
    const d = s.d;
    if (d.kind === 'priority' || d.kind === 'focus') s.pick('Passar');
    else if (d.prompt.startsWith('Distribuir dano')) s.ok([d.options[0].id]);
    else {
      const a = other?.(d);
      if (!a) return;
      s.ok(a);
    }
  }
}

test('Rell, Magnetic: anexar é um gatilho reflexivo abaixo do Quick-Draw; Rell termina com o Equipment (FAQ SFD 14/01/2026)', () => {
  const s = new Scenario();
  const rell = s.put(0, 'SFD-024', base(0));
  const elder = s.put(0, 'OGN-065', base(0));
  const sword = s.put(0, 'SFD-022', 'hand'); // Long Sword: Quick-Draw
  s.put(1, 'OGN-019', BF0);
  s.go();
  moveTo(s, [rell.id], 'Campo Vazio A');
  let qdAsked = false;
  run(s, (d) => {
    if (d.kind === 'confirm') return ['yes'];
    if (/Quick-Draw/.test(d.prompt)) {
      qdAsked = true;
      // o Quick-Draw ainda vai resolver: o anexo a Rell não aconteceu antes dele
      assert.notEqual(sword.attachedTo, rell.id, 'o anexo a Rell é outro item da pilha, abaixo do Quick-Draw');
      return [d.options.find((o) => o.obj === elder.id)!.id];
    }
    return undefined;
  });
  assert.ok(qdAsked, s.log(60));
  assert.ok(/Na pilha: Rell, Magnetic: anexar Long Sword a mim/.test(s.log(80)), s.log(80));
  assert.equal(sword.attachedTo, rell.id, 'o reflexo de Rell resolve por último\n' + s.log(60));
});

test('Rell, Magnetic: se Rell sai antes do reflexo resolver, o Equipment fica onde está', () => {
  const s = new Scenario();
  const rell = s.put(0, 'SFD-024', base(0));
  const sword = s.put(0, 'SFD-009', 'hand'); // Serrated Dirk: sem Quick-Draw
  s.put(1, 'OGN-019', BF0);
  // B tem uma Reaction para poder responder (sem opções, o motor passa sozinho)
  s.put(1, 'SFD-001', 'hand');
  s.runes(1, [RUNE.fury, RUNE.fury]);
  s.go();
  moveTo(s, [rell.id], 'Campo Vazio A');
  // até o reflexo estar na pilha; então mata Rell antes de ele resolver
  for (let i = 0; i < 30 && !s.e.chain.some((it) => /anexar/.test(it.label)); i++) {
    if (s.d.kind === 'confirm') s.ok(['yes']);
    else if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else break;
  }
  assert.ok(s.e.chain.some((it) => /anexar Serrated Dirk/.test(it.label)), s.log(40));
  s.e.runSync(s.e.killG(rell));
  run(s, (d) => (d.kind === 'confirm' ? ['yes'] : undefined));
  assert.equal(sword.zone, 'board');
  assert.equal(sword.attachedTo, undefined, s.log(40));
});

test('Battering Ram: uma jogada anterior do próprio Ram neste turno também conta', () => {
  const s = new Scenario();
  const ram = s.put(0, 'SFD-012', 'hand');
  const e = s.e;
  e.pl[0].played.push(ram.id); // jogado antes neste turno e voltou para a mão
  assert.equal(e.energyDiscount(ram, 0), -1);
});
