import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Decree of Insight
registerCard({
  code: 'VEN-061',
  keywords: { reaction: true },
  ignoreDeflectCost: true,
  spell: {
    label: 'Decree of Insight',
    targets: [{ prompt: 'Decree of Insight: -5 Might em qual unidade Body inimiga?', filter: (c, o) => o.controller !== c.p && hasDomain(c.g, o, 'Body') }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, -5);
    },
  },
});
