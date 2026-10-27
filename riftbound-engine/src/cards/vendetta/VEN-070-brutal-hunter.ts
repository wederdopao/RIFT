import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-070',
  empower: E(3),
  mightMod: (g, self) => (self.empowered ? 2 : 0),
  kwMod: (g, self) => (self.empowered ? { ganking: true } : undefined),
});
