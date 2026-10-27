import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Frostcoat Mother
registerCard({
  code: 'VEN-032',
  mightMod: (g, self) => (self.empowered ? 3 : 0),
  // "[Empower][12]. This ability costs [1] less for each rune you control" (827.1.c.3)
  empower: { cost: (g, _self, p) => E(Math.max(0, 12 - runes(g, p))) },
});
