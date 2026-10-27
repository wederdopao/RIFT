import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-080',
  triggers: [
    {
      on: 'conquer',
      label: 'Matar um gear com custo <= meu Might',
      optional: 'Noxian Demolitionist: matar um gear?',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      targets: [
        {
          prompt: 'Noxian Demolitionist: matar qual gear?',
          kind: 'gear',
          filter: (c, o) => c.g.data(o).energy <= c.g.might(c.self),
        },
      ],
      resolve: function* (c) {
        const t = c.targets[0][0];
        if (t) yield* c.g.killG(t);
      },
    },
  ],
});
