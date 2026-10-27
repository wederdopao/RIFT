import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-078',
  empower: E(1, 'any', 'any'),
  mightMod: (g, self) => (self.empowered ? 2 : 0),
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell (Empowered): canalizar 2 runas exaustas',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.snap?.empowered,
      resolve: function* (c) {
        c.g.channel(c.p, 2, true);
      },
    },
  ],
});
