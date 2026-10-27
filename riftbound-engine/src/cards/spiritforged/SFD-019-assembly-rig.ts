import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// [1][Fury], recicle uma unidade do seu descarte, [Tap]: jogue uma ficha de unidade Mech 3 na sua base.
// Reciclar é custo (não é alvo, 355.10.c): escolhido ao ativar.
registerCard({
  code: 'SFD-019',
  activated: [
    {
      label: 'Reciclar uma unidade do descarte: ficha Mech 3 na base',
      cost: E(1, 'Fury'),
      exhaustSelf: true,
      canPayExtra: (c) => c.g.pl[c.p].trash.some((id) => c.g.isUnit(c.g.objs[id])),
      extraCost: function* (c) {
        const g = c.g;
        const us = g.pl[c.p].trash.map((id) => g.objs[id]).filter((o) => g.isUnit(o));
        if (!us.length) return false;
        const [u] = yield* g.chooseObj(c.p, 'Assembly Rig: reciclar qual unidade do seu descarte?', us);
        g.recycleCard(u, { by: c.p });
        g.say(`${g.pname(c.p)} recicla ${g.name(u)} do descarte.`, c.p);
        return true;
      },
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-MECH', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
