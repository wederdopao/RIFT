import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Plaza Guardian
registerCard({
  code: 'VEN-064',
  keywords: { deflect: 1 },
  selfCostMod: (g, self, p) => -g.gearOf(p).length,
});
