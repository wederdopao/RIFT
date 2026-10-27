import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-121',
  triggers: [
    {
      on: 'play',
      label: 'Reluctant Leader: +2 Might neste turno',
      cond: (c, ev) => !!ev.obj && ev.player === c.p && ev.obj.id !== c.self.id && c.g.isUnit(ev.obj),
      resolve: function* (c) {
        c.g.giveMight(c.self, 2);
      },
    },
  ],
});
