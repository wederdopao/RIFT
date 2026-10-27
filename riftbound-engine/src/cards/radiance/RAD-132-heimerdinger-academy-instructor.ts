import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-132',
  tokenCodeReplace: function* (g, self, code, p, loc) {
    if (self.controller !== p || g.bfIndex(self) < 0 || code === 'TOK-MECH') return undefined;
    return (yield* g.yesNo(p, 'Heimerdinger: jogar uma ficha Mech de 3 Might em vez disso?')) ? 'TOK-MECH' : undefined;
  },
});
