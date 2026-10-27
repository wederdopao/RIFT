import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-072',
  mightMod: (g, self) => {
    const i = g.bfIndex(self);
    return i >= 0 && g.board().some((o) => g.isGear(o) && o.controller === self.controller && g.bfIndex(o) === i && !!g.baseKeywords(o).deploy) ? 1 : 0;
  },
});
