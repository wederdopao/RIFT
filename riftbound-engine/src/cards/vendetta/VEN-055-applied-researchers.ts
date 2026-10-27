import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Applied Researchers
registerCard({
  code: 'VEN-055',
  empower: E(3),
  auras: [
    {
      costModMin: (g, src, card, p) => (src.zone === 'board' && src.empowered && src.controller === p && g.kind(card) === 'spell' ? { amount: 1, min: 1 } : undefined),
      spellCostMod: (g, src, card, p) => (src.zone === 'board' && src.empowered && src.controller === p ? { powerLess: 1 } : undefined),
    },
  ],
});
