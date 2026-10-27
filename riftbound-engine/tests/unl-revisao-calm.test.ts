// Revisão independente do lote calm do Unleashed (UNL-031..UNL-060): um teste por erro achado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario, RUNE } from './harness';
import type { P } from '../src/engine/types';

const BF0 = { t: 'bf', i: 0 } as const;
const base = (p: P) => ({ t: 'base', p }) as const;
const calm = (n: number) => Array.from({ length: n }, () => RUNE.calm);
const SKULKER = 'OGN-175'; // 3, sem texto

/** Passa a prioridade e ordena gatilhos simultâneos até chegar noutra decisão. */
function drain(s: Scenario) {
  for (let i = 0; i < 60 && s.g.current && s.d.kind !== 'action'; i++) {
    if (s.d.kind === 'priority' || s.d.kind === 'focus') s.pick('Passar');
    else if (s.d.prompt.startsWith('Vários efeitos')) s.ok([s.d.options[0].id]);
    else if (s.d.prompt.startsWith('Distribuir')) s.ok([s.d.options[0].id]);
    else break;
  }
}

// ───────────────────────────── Tricksy Tentacles ─────────────────────────────
// Erro: o movimento usava a chamada síncrona, que paga sozinho o custo aplicado do Mageseeker Investigator ("Opponents
// must pay [A] for each unit beyond the first to move multiple units to my battlefield at the same time"). O custo
// aplicado é pago quando o movimento acontece e quem move pode não pagar — aí o movimento não acontece (204.4.b-c).
function tricksyIntoInvestigator(answer: 'Sim' | 'Não') {
  const s = new Scenario();
  const inv = s.put(1, 'UNL-163', BF0); // Mageseeker Investigator de B, no campo A
  s.e.bfs[0].controller = 1;
  const a = s.put(1, 'TOK-BIRD', base(1)); // 1
  const b = s.put(1, SKULKER, base(1)); // 3
  s.runes(0, calm(6));
  s.put(0, 'UNL-054', 'hand');
  s.go();
  s.pick('Jogar Tricksy Tentacles');
  s.pickObj(a);
  s.pickObj(b);
  if (!s.d.root && s.d.prompt.includes('mais uma')) s.ok([]);
  s.pick('Campo Vazio A');
  drain(s);
  assert.match(s.d.prompt, /custo aplicado/, 'pergunta se paga o custo aplicado\n' + s.log());
  s.pick(answer);
  drain(s);
  return { s, a, b, inv };
}
test('Tricksy Tentacles × Mageseeker Investigator: quem move escolhe não pagar e as unidades ficam (204.4.c)', () => {
  const { s, a, b } = tricksyIntoInvestigator('Não');
  assert.deepEqual(a.loc, base(1), s.log());
  assert.deepEqual(b.loc, base(1), s.log());
});
test('Tricksy Tentacles × Mageseeker Investigator: pagando [A], as duas vão juntas', () => {
  const { s, a, b } = tricksyIntoInvestigator('Sim');
  assert.deepEqual(a.loc, BF0, s.log());
  assert.deepEqual(b.loc, BF0, s.log());
});
