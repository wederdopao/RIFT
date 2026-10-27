import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-072',
  keywords: { action: true },
  spell: {
    label: 'Guttural Roar',
    targets: [T.anyUnit('Guttural Roar: +Might em qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, u.empowered ? 4 : 2);
    },
  },
});
