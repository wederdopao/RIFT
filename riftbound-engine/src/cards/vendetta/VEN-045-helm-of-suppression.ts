import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Helm of Suppression
registerCard({
  code: 'VEN-045',
  empower: E(4, 'Calm'),
  auras: [
    {
      costMod: (g, src, card, p) => (src.zone === 'board' && p !== src.controller && g.kind(card) === 'spell' ? 1 : 0),
      spellCostMod: (g, src, card, p) => (src.zone === 'board' && p !== src.controller && src.empowered ? { powerMore: 1 } : undefined),
    },
  ],
});
