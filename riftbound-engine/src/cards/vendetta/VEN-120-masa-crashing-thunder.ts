import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-120',
  optionalCosts: [{ label: 'Pagar [Order] a mais (Stun numa unidade inimiga)?', cost: E(0, 'Order'), flag: 'paid' }],
  triggers: [
    {
      on: 'play',
      label: 'Masa: Stun numa unidade inimiga num campo',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.paid,
      targets: [{ prompt: 'Masa: Stun em qual unidade inimiga num campo?', filter: (c, o) => o.controller !== c.p && atBf(c, o) }],
      resolve: function* (c) {
        const t = c.targets[0][0];
        if (t) c.g.stun(t, c.p);
      },
    },
  ],
});
