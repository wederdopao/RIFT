import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-127',
  asPlayed: showOff((g, o) => g.data(o).energy >= 7, 'Show Off uma carta com Energy 7 ou mais'),
  spell: {
    label: 'Rousing Display',
    resolve: function* (c) {
      const n = showedOff(c) ? 4 : 2;
      for (let k = 0; k < n; k++) yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p });
    },
  },
});
