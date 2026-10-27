import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-093',
  keywords: { disarm: 2 },
  entersReady: (g, self) => !g.units().some((o) => o.controller === self.controller && o.id !== self.id),
});
