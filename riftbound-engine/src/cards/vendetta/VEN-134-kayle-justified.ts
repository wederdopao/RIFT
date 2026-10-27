import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-134',
  mightMod: (g, self) => 2 * g.empowerCount(self),
  kwMod: (g, self) => (g.empowerCount(self) >= 3 ? { deflect: 3, ganking: true } : undefined),
  // "[Empower][3] ([3]: Empower me.) I can be Empowered up to three times."
  empower: { cost: E(3), max: 3 },
});
