import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-079',
  spell: {
    label: 'Avalanche',
    resolve: function* (c) {
      for (const u of c.g.units().filter((x) => x.loc?.t === 'base')) c.g.dealDamage(u, 3, c.self);
    },
  },
});
