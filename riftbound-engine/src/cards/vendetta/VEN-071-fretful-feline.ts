import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-071',
  triggers: [
    {
      on: 'ready',
      label: 'Fretful Feline: +2 Might neste turno',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        c.g.giveMight(c.self, 2);
      },
    },
  ],
});
