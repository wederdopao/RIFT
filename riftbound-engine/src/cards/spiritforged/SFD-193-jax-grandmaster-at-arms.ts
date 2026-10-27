import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import type { Engine } from '../../engine/engine';
import type { Obj } from '../../engine/types';
// Lenda:
// [1], [Tap]: prenda um Equipamento solto que você controla numa unidade que você controla.
// [Tap]: prenda um Equipamento preso que você controla numa unidade que você controla.
// O Equipamento e a unidade são alvos escolhidos ao ativar (regras 355.7 e 355.10). Prender não é Equip (não paga o
// custo de Equip) nem movimento (regra 434.4.a); prender no mesmo hospedeiro não faz nada (434.1.g). Sem [Reaction]:
// só no seu turno, fora de showdown e com a pilha vazia.
const isEquip = (g: Engine, o: Obj) => g.isGear(o) && g.data(o).tags.includes('Equipment');
function ability(attached: boolean, label: string, cost?: ReturnType<typeof E>) {
  return {
    label,
    exhaustSelf: true,
    cost,
    targets: [
      {
        prompt: `Jax: qual Equipamento ${attached ? 'preso' : 'solto'} seu?`,
        kind: 'gear' as const,
        filter: (c: any, o: Obj) => o.controller === c.p && isEquip(c.g, o) && !!o.attachedTo === attached,
      },
      { prompt: 'Jax: prender em qual unidade sua?', filter: (c: any, o: Obj) => o.controller === c.p },
    ],
    resolve: function* (c: any) {
      const g = c.g as Engine;
      const eq = c.targets[0]?.[0] as Obj | undefined;
      const u = c.targets[1]?.[0] as Obj | undefined;
      if (!eq || !u || eq.zone !== 'board' || u.zone !== 'board') return;
      if (eq.attachedTo === u.id) return; // já está preso nela (434.1.g)
      g.attach(eq, u, c.p);
    },
  };
}
registerCard({
  code: 'SFD-193',
  activated: [ability(false, '[1], exaurir: prender um Equipamento solto seu', E(1)), ability(true, 'Exaurir: mudar um Equipamento preso seu de unidade')],
});
