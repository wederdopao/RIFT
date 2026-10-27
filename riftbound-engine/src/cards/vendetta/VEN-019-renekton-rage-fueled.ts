import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Renekton, Rage Fueled
registerCard({
  code: 'VEN-019',
  keywords: { accelerate: true },
  triggers: [
    {
      on: 'attack',
      label: '2 de dano em todas as unidades inimigas aqui (4 ou menos runas)',
      cond: (c, ev) => ev.unit?.id === c.self.id && runes(c.g, c.p) <= 4,
      resolve: function* (c) {
        const g = c.g;
        const i = g.bfIndex(c.self);
        if (i < 0) return;
        for (const u of g.unitsAtBf(i).filter((x) => x.controller !== c.p)) g.dealDamage(u, 2, c.self);
      },
    },
  ],
});
