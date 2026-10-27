import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Grumpy Rockbear
registerCard({
  code: 'VEN-050',
  kwMod: (g, self) => (self.empowered ? { deflect: 1, shield: 3 } : undefined),
  // "[Empower][12]. This ability costs [1] less for each rune you control" (827.1.c.3)
  empower: { cost: (g, _self, p) => E(Math.max(0, 12 - runes(g, p))) },
});
