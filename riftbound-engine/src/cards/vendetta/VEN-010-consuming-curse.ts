import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Consuming Curse
registerCard({
  code: 'VEN-010',
  keywords: { action: true },
  spell: {
    label: 'Consuming Curse',
    targets: [T.unitAtBf('Consuming Curse: dano em qual unidade num campo de batalha?')],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u) return;
      const name = g.data(c.self).name;
      const n = g.pl[c.p].trash.filter((id) => g.data(g.objs[id]).name === name).length;
      g.dealDamage(u, 2 + n, c.self);
    },
  },
});
