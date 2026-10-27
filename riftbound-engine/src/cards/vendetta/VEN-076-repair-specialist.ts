import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-076',
  kwMod: (g, self) => {
    const n = g.gearOf(self.controller).length;
    return n ? { assault: n } : undefined;
  },
});
