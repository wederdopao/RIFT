import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-128',
  empower: E(1, 'Order'),
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell (Empowered): jogar duas fichas Recruit',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.snap?.empowered,
      resolve: function* (c) {
        for (let k = 0; k < 2; k++) yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
