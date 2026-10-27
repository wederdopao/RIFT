import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-075',
  keywords: { deflect: 1 },
  optionalCosts: [
    {
      label: 'Devolver um gear aliado para a mão para custar [2] a menos?',
      flag: 'returned',
      energyMod: -2,
      canPay: (g, self, p) => g.board().some((o) => g.isGear(o) && o.controller === p),
      pay: function* (c) {
        const g = c.g;
        const gears = g.board().filter((o) => g.isGear(o) && o.controller === c.p);
        if (!gears.length) return false;
        const [o] = yield* g.chooseObj(c.p, 'Skystrike Squadron: devolver qual gear para a mão?', gears);
        if (!o) return false;
        g.returnToHand(o);
        return true;
      },
    },
  ],
});
