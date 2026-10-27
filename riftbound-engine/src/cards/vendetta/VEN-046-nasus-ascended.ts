import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Nasus, Ascended
registerCard({
  code: 'VEN-046',
  keywords: { deflect: 2 },
  empower: E(8),
  triggers: [
    {
      on: 'conquer',
      label: 'Empowered: ganhar 1 ponto',
      cond: (c, ev) => c.self.empowered && ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, 'Nasus, Ascended');
      },
    },
  ],
});
