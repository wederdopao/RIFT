import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-085',
  noCombatDamage: () => true,
  triggers: [
    {
      on: ['attack', 'defend'],
      label: 'Dano igual ao meu Might a todas as unidades inimigas aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const i = g.bfIndex(c.self);
        if (i < 0) return;
        const n = g.might(c.self);
        for (const u of g.unitsAtBf(i).filter((x) => x.controller !== c.p)) g.dealDamage(u, n, c.self);
      },
    },
  ],
});
