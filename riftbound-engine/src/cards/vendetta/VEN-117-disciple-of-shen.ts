import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-117',
  keywords: { hidden: true },
  kwMod: (g, self) => {
    const i = g.bfIndex(self);
    if (i < 0) return undefined;
    return g.unitsAtBf(i, self.controller).filter((u) => u.id !== self.id).length === 1 ? { shield: 3 } : undefined;
  },
});
