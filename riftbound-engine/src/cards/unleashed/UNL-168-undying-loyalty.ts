import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import { NO_COST, type Obj, type P } from '../../engine/types';

// Isto custa [2] a menos se você escolher um Bird, Cat, Dog ou Poro.
// Jogue do seu descarte uma unidade com custo até [2] e até [A], ignorando o custo dela.
// - A unidade no descarte é alvo (355.10.a), escolhida ao jogar; o desconto depende dessa escolha: entra no custo
//   total com os alvos escolhidos (selfCostMod com `chosen`, 356.4). Antes de escolher, a estimativa é otimista.
// - "Custo até [2] e até [A]": custo impresso de energia ≤ 2 e de power ≤ 1. "Ignorando o custo": energia e power
//   zerados (356.1.b.1); custos adicionais dela continuam podendo ser pagos (playFromEffect). Local: base ou campo seu.
const TAGS = ['Bird', 'Cat', 'Dog', 'Poro'];
const tagged = (g: Engine, o: Obj) => TAGS.some((t) => g.hasTag(o, t));
const okUnit = (g: Engine, p: P, o: Obj) => g.pl[p].trash.includes(o.id) && g.isUnit(o) && g.data(o).energy <= 2 && g.data(o).power <= 1;
registerCard({
  code: 'UNL-168',
  selfCostMod: (g, self, p, chosen) => {
    if (chosen) return chosen.some((o) => tagged(g, o)) ? -2 : 0;
    return g.pl[p].trash.some((id) => okUnit(g, p, g.objs[id]) && tagged(g, g.objs[id])) ? -2 : 0;
  },
  spell: {
    label: 'Undying Loyalty',
    targets: [
      {
        prompt: 'Undying Loyalty: jogar qual unidade do seu descarte (custo até [2] e até [A])?',
        kind: 'trash',
        filter: (c: Ctx, o) => okUnit(c.g, c.p, o),
      },
    ],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u && u.zone === 'trash') yield* c.g.playFromEffect(c.p, u, NO_COST);
    },
  },
});
