// Helpers locais do lote VEN-070..138.
import type { ActivatedDef, Ctx } from '../../engine/script';
import { empowerAbilityOf } from '../../engine/script';
import type { Cost, Gen, Obj } from '../../engine/types';

/**
 * Antigo atalho de Empower: hoje é só um apelido do mecanismo único do motor (CardScript.empower → habilidade ativada de
 * verdade, 827). Nas cartas use `empower: { cost, exhaustSelf, extra: { label, canPay, pay } }`.
 */
export const empowerAct = (
  o: { cost?: Cost; exhaustSelf?: boolean; canPay?: (c: Ctx) => boolean; pay?: (c: Ctx) => Gen<boolean>; label?: string } = {},
): ActivatedDef =>
  empowerAbilityOf({ cost: o.cost, exhaustSelf: o.exhaustSelf, extra: o.pay ? { label: o.label ?? 'custo', canPay: o.canPay ?? (() => true), pay: o.pay } : undefined });

export const hasDomain = (g: Ctx['g'], o: Obj, d: string) => (g.data(o).domains as string[]).includes(d);
