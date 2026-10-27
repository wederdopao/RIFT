import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-125',
  keywords: { deflect: 1 },
  optionalCosts: [
    {
      label: 'Matar uma unidade aliada para custar [2] a menos?',
      flag: 'sacrificed',
      energyMod: -2,
      canPay: (g, self, p) => g.units().some((u) => u.controller === p),
      pay: function* (c) {
        const g = c.g;
        const us = g.units().filter((u) => u.controller === c.p);
        if (!us.length) return false;
        const [u] = yield* g.chooseObj(c.p, 'Dune Devourer: matar qual unidade aliada?', us);
        if (!u) return false;
        yield* g.killG(u);
        return true;
      },
    },
  ],
});
