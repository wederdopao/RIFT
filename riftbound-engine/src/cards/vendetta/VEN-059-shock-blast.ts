import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Shock Blast
registerCard({
  code: 'VEN-059',
  keywords: { action: true },
  selfCostMod: (g, self, p) => (g.board().some((o) => o.controller === p && o.empowered) || g.legendsOf(p).some((l) => l.empowered) ? -2 : 0),
  spell: {
    label: 'Shock Blast',
    targets: [T.unitAtBf('Shock Blast: 4 de dano em qual unidade num campo de batalha?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 4, c.self);
    },
  },
});
