import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Esteemed Hierophant
registerCard({
  code: 'VEN-025',
  preventDamageFrom: (g, self) => runes(g, self.controller) >= 7,
});
