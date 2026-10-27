import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Otterpus
registerCard({
  code: 'VEN-053',
  replaceScore: (g, self, p) => (g.pl[p].turns || 0) <= 2,
});
