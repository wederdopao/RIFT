import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Temporal Breach
registerCard({
  code: 'VEN-066',
  keywords: { hidden: true },
  spell: {
    label: 'Temporal Breach',
    targets: [T.anyUnit('Temporal Breach: banir qual unidade?')],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u) return;
      const loc = g.locOf(u);
      const owner = u.owner;
      g.banishObj(u);
      if (u.zone === 'banish' && !u.token) yield* g.playFromEffect(owner, u, NO_COST, loc);
    },
  },
});
