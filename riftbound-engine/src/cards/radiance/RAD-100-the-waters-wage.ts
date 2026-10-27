import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-100',
  keywords: { hidden: true },
  spell: {
    label: "The Waters' Wage",
    resolve: function* (c) {
      const g = c.g;
      const base = { t: 'base', p: c.p } as const;
      if (c.hiddenBf !== undefined && g.active === c.p) for (let k = 0; k < 3; k++) g.createToken('TOK-GOLD', c.p, base, true);
      else g.createToken('TOK-GOLD', c.p, base, false);
    },
  },
});
