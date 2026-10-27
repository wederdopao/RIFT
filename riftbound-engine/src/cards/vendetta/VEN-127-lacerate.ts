import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-127',
  flow: E(4, 'Order', 'Order'),
  spell: {
    label: 'Lacerate',
    targets: [T.anyUnit('Lacerate: qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      c.g.disempower(u);
      if (c.g.might(u) <= 3) yield* c.g.killG(u);
    },
  },
});
