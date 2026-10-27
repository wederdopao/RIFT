import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-119',
  selfCostMod: (g, self, p) => (g.bfs.some((b, i) => b.controller === p && g.unitsAtBf(i).length === 2) ? -2 : 0),
  selfPowerCut: (g, self, p) => (g.bfs.some((b, i) => b.controller === p && g.unitsAtBf(i).length === 2) ? { domain: 'Order', n: 1 } : undefined),
});
