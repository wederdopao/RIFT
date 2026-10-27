import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-136',
  empower: E(1, 'Order', 'Order'),
  kwMod: (g, self) => (self.empowered ? { assault: 2 } : undefined),
  triggers: [
    {
      on: 'attack',
      label: 'Ambessa: matar unidade inimiga aqui com menos Might',
      cond: (c, ev) => ev.unit?.id === c.self.id && !ev.playerLevel && c.self.empowered,
      targets: [
        {
          prompt: 'Ambessa: matar qual unidade inimiga aqui com menos Might que eu?',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self) && c.g.might(o) < c.g.might(c.self),
        },
      ],
      resolve: function* (c) {
        const t = c.targets[0][0];
        if (t) yield* c.g.killG(t);
      },
    },
  ],
});
