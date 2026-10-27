import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Otterpus
registerCard({
  code: 'VEN-053',
  // "during THEIR first or second turn": só no turno do próprio jogador que pontua (pontuar no turno do oponente,
  // ex.: conquista por movimento numa reação, não é substituído)
  replaceScore: (g, self, p) => g.active === p && (g.pl[p].turns || 0) <= 2,
});
