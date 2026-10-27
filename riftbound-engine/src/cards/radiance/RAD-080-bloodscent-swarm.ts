import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-080',
  selfCostMod: (g, self, p) => -2 * g.conqueredThisTurn.filter((k) => k.startsWith(`${p}-`)).length,
});
