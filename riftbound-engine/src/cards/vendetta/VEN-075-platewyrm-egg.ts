import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-075',
  entersReady: () => false,
  empower: { cost: E(1), exhaustSelf: true },
  activated: [
    {
      label: 'Adicionar energia (2 se Empowered)',
      timing: 'reaction',
      isAdd: true,
      exhaustSelf: true,
      adds: { energy: 1 },
      resolve: function* (c) {
        if (c.self.empowered) c.g.addResources(c.p, 1, []);
      },
    },
  ],
});
