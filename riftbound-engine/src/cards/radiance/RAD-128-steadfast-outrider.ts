import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-128',
  keywords: { tank: true },
  mightMod: (g, self) => {
    const i = g.bfIndex(self);
    if (i < 0) return 0;
    const n = g.board().filter((o) => o.id !== self.id && o.controller === self.controller && (g.isUnit(o) || g.isGear(o)) && g.bfIndex(o) === i).length;
    return n >= 2 ? 2 : 0;
  },
});
