import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-079',
  empower: E(5, 'Body'),
  triggers: [
    {
      on: ['attack', 'defend'],
      label: 'Dame: igualar o Might de uma unidade aqui, +1',
      cond: (c, ev) => ev.unit?.id === c.self.id && !ev.playerLevel && c.self.empowered,
      targets: [
        {
          prompt: 'Dame the Despoiler: qual unidade aqui?',
          filter: (c, o) => c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u || c.self.zone !== 'board') return;
        const diff = c.g.might(u) - c.g.might(c.self);
        if (diff > 0) c.g.giveMight(c.self, diff);
        c.g.giveMight(c.self, 1);
      },
    },
  ],
});
