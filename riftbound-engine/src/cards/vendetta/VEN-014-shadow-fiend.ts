import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Shadow Fiend
registerCard({
  code: 'VEN-014',
  empower: E(2, 'Fury'),
  kwMod: (g, self) => (self.empowered ? { assault: 3 } : undefined),
});
