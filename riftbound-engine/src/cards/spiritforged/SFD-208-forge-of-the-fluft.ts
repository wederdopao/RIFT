import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';
// Campo: enquanto você controla este campo, as lendas aliadas têm "[Tap]: prenda um Equipamento que você controla numa
// unidade que você controla."
// A habilidade é da lenda (motor: aura grantActivated); o Equipamento e a unidade são alvos (regra 355.7). Sem
// [Reaction]: só no seu turno, fora de showdown e com a pilha vazia. Prender no mesmo hospedeiro não faz nada (434.1.g).
registerCard({
  code: 'SFD-208',
  auras: [
    {
      grantActivated: (g, src, holder) => {
        const i = g.bfOf(src);
        const ctrl = i >= 0 ? g.bfs[i].controller : null;
        return ctrl !== null && g.kind(holder) === 'legend' && holder.controller === ctrl ? [0] : [];
      },
    },
  ],
  activated: [
    {
      label: 'Exaurir: prender um Equipamento seu numa unidade sua',
      exhaustSelf: true,
      targets: [
        {
          prompt: 'Forge of the Fluft: qual Equipamento seu?',
          kind: 'gear',
          filter: (c, o: Obj) => o.controller === c.p && c.g.data(o).tags.includes('Equipment'),
        },
        { prompt: 'Forge of the Fluft: prender em qual unidade sua?', filter: (c, o) => o.controller === c.p },
      ],
      resolve: function* (c) {
        const eq = c.targets[0]?.[0];
        const u = c.targets[1]?.[0];
        if (!eq || !u || eq.zone !== 'board' || u.zone !== 'board' || eq.attachedTo === u.id) return;
        c.g.attach(eq, u, c.p);
      },
    },
  ],
});
