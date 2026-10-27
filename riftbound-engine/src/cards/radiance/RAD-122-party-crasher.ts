import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-122',
  keywords: { tank: true },
  selfCostMod: (g, self, p) => -g.units().filter((u) => u.controller === p && u.exhausted).length,
});
