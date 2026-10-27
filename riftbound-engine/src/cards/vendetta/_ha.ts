// Helpers locais do lote VEN-001..069.
import type { ActivatedDef, Ctx } from '../../engine/script';
import { empowerAbilityOf } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Cost, P } from '../../engine/types';

export const opp = (p: P): P => (p === 0 ? 1 : 0);
export const runes = (g: Engine, p: P) => g.runesOf(p).length;
export const hasDomain = (g: Engine, o: { code: string }, d: string) => !!(g.data(o as any) as any).domains?.includes(d);

/**
 * Antigo atalho de Empower: hoje é só um apelido do mecanismo único do motor (CardScript.empower → habilidade ativada de
 * verdade, 827). Nas cartas use `empower: { cost: (g, self, p) => ... }`.
 */
export const empowerAbility = (cost: (c: Ctx) => Cost): ActivatedDef =>
  empowerAbilityOf({ cost: (g, self, p) => cost({ g, self, p, targets: [], data: {}, rep: 0 }) });
