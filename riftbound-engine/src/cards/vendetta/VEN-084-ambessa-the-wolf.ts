import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-084',
  empower: E(3, 'Body'),
  mightMod: (g, self) => (self.empowered ? 3 : 0),
  noDamage: (g, self) => self.empowered && !g.inCombat(self),
});
