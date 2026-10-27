import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Forsaken Baccai
registerCard({
  code: 'VEN-005',
  triggers: [
    {
      on: 'beginStart',
      label: '+1 Might (menos runas que um oponente)',
      cond: (c, ev) => ev.player === c.p && runes(c.g, c.p) < runes(c.g, opp(c.p)),
      resolve: function* (c) {
        c.g.giveMight(c.self, 1);
      },
    },
  ],
});
