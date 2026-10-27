import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Twilight Shroud
registerCard({
  code: 'VEN-031',
  flow: E(2),
  spell: {
    label: 'Twilight Shroud',
    targets: [T.friendlyUnit('Twilight Shroud: +1 Might em qual unidade sua?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      c.g.giveMight(u, 1);
      c.g.addEffect({ target: u.id, flag: 'untargetable', until: 'turn' });
    },
  },
});
