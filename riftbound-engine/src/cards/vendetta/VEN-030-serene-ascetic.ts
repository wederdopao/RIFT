import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Serene Ascetic
registerCard({
  code: 'VEN-030',
  empower: E(3),
  kwMod: (g, self) => (self.empowered ? { deflect: 1, shield: 3 } : undefined),
});
