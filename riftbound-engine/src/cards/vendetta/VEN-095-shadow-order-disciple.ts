import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-095',
  triggers: [
    {
      on: 'move',
      label: 'Shadow Order Disciple: Burn 1 para +1 Might',
      optional: 'Shadow Order Disciple: Burn 1 para +1 Might neste turno?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        c.g.burn(c.p, 1);
        c.g.giveMight(c.self, 1);
      },
    },
  ],
});
