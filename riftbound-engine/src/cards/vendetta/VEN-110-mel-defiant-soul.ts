import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-110',
  empower: {
    extra: {
      label: 'Discard a spell',
      canPay: (c) => c.g.pl[c.p].hand.some((id) => c.g.kind(c.g.objs[id]) === 'spell'),
      pay: function* (c) {
        const g = c.g;
        const sp = g.pl[c.p].hand.map((id) => g.objs[id]).filter((o) => g.kind(o) === 'spell');
        if (!sp.length) return false;
        const [d] = yield* g.chooseObj(c.p, 'Mel: descartar qual spell?', sp);
        if (!d) return false;
        g.discardObjs(c.p, [d]);
        return true;
      },
    },
  },
  triggers: [
    {
      on: 'empower',
      label: 'Mel: banir unidade inimiga num campo com 3 Might ou menos',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [
        {
          prompt: 'Mel: banir qual unidade inimiga num campo (Might <= 3)?',
          filter: (c, o) => o.controller !== c.p && atBf(c, o) && c.g.might(o) <= 3,
        },
      ],
      resolve: function* (c) {
        const t = c.targets[0][0];
        if (t) c.g.banishObj(t);
      },
    },
  ],
});
