import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Steel Paws
registerCard({
  code: 'VEN-043',
  keywords: { deflect: 1 },
  empower: E(7),
  mightMod: (g, self) => (self.empowered ? 7 : 0),
});
