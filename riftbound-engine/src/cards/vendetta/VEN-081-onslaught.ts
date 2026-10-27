import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-081',
  flow: E(4),
  spell: {
    label: 'Onslaught',
    targets: [T.anyUnit('Onslaught: +6 Might em qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, 6);
    },
  },
});
