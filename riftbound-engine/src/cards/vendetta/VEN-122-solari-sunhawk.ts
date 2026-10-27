import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-122',
  empower: E(2),
  mightMod: (g, self) => (self.empowered ? 1 : 0),
  kwMod: (g, self) => (self.empowered ? { deflect: 2 } : undefined),
});
