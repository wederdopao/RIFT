// Previsão de combate da mesa (src/ui/interact.ts): quando o resultado depende de uma escolha do motor (unidade com
// Tank e "por último" ao mesmo tempo: quem atribui o dano escolhe qual vale, 465.2.c.8–9), mostra as possibilidades.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scenario } from './harness';
import { moveCombat } from '../src/ui/interact';

const CAITLYN = 'OGN-068'; // Caitlyn, Patrolling: 3 de Might, "I must be assigned combat damage last."
const SCOUT = 'OGN-216'; // 1 de Might
const BF0 = { t: 'bf', i: 0 } as const;

test('previsão: Tank e "por último" na mesma unidade dá dois resultados possíveis', () => {
  const s = new Scenario();
  const atk = s.put(0, CAITLYN, { t: 'base', p: 0 }, { ready: true });
  const cait = s.put(1, CAITLYN, BF0);
  const scout = s.put(1, SCOUT, BF0);
  s.e.giveKw(cait, { tank: true });
  s.go();
  const cp = moveCombat(s.e, 0, [atk.id], 0)!;
  assert.ok(cp, 'abre combate');
  assert.equal(cp.alts.length, 2, 'uma possibilidade para cada escolha');
  assert.deepEqual(cp.alts.map((a) => a.label).sort(), ['Caitlyn, Patrolling: Tank', 'Caitlyn, Patrolling: por último']);
  const tankAlt = cp.alts.find((a) => a.label.endsWith('Tank'))!;
  const lastAlt = cp.alts.find((a) => a.label.endsWith('por último'))!;
  assert.ok(tankAlt.dies.has(cait.id) && !tankAlt.dies.has(scout.id));
  assert.ok(lastAlt.dies.has(scout.id) && !lastAlt.dies.has(cait.id));
  // a atacante morre nos dois casos; as defensoras, só em um
  assert.ok(cp.dies.has(atk.id));
  assert.ok(cp.maybe.has(cait.id) && cp.maybe.has(scout.id));
});

test('previsão: sem a escolha ambígua continua um resultado só', () => {
  const s = new Scenario();
  const atk = s.put(0, CAITLYN, { t: 'base', p: 0 }, { ready: true });
  s.put(1, CAITLYN, BF0);
  s.put(1, SCOUT, BF0);
  s.go();
  const cp = moveCombat(s.e, 0, [atk.id], 0)!;
  assert.equal(cp.alts.length, 0);
  assert.equal(cp.maybe.size, 0);
});
