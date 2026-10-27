import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Decree of Rage
registerCard({
  code: 'VEN-015',
  keywords: { action: true },
  uncounterable: true,
  spell: {
    label: 'Decree of Rage',
    targets: [{ prompt: 'Decree of Rage: 4 de dano em qual unidade Calm inimiga?', filter: (c, o) => o.controller !== c.p && hasDomain(c.g, o, 'Calm') }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 4, c.self);
    },
  },
});
