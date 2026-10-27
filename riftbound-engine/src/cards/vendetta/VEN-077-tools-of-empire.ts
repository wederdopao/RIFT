import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-077',
  empower: E(2),
  activated: [
    {
      label: 'Dar +2 Might (+4 se Empowered)',
      exhaustSelf: true,
      targets: [T.anyUnit('Tools of Empire: +Might em qual unidade?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, c.self.empowered ? 4 : 2);
      },
    },
  ],
});
