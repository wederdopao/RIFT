import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-134',
  spell: {
    label: 'Raucous Anthem',
    resolve: function* (c) {
      for (const u of c.g.units().filter((x) => x.controller === c.p)) {
        c.g.ready(u, c.p);
        c.g.giveMight(u, 3);
      }
    },
  },
});
