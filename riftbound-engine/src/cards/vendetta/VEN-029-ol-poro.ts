import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Ol' Poro
registerCard({
  code: 'VEN-029',
  canPlay: (g, self, p) => (g.pl[p].turns || 0) >= 4,
});
