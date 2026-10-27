import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Hand Hammer
registerCard({
  code: 'VEN-027',
  equipCost: E(0, 'Calm'),
  equipped: {
    mightMod: (g, gear, unit) => {
      if (unit.loc?.t !== 'bf') return 0;
      const others = g.unitsAtBf(unit.loc.i, unit.controller).filter((u) => u.id !== unit.id);
      return others.length === 1 ? 2 : 0;
    },
  },
});
