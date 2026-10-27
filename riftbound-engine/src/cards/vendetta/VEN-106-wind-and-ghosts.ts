import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-106',
  keywords: { action: true },
  spell: {
    label: 'Wind and Ghosts',
    targets: [T.unitAtBf('Wind and Ghosts: qual unidade num campo?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      if (c.g.might(u) <= 3) c.g.banishObj(u);
      else c.g.returnToHand(u);
    },
  },
});
