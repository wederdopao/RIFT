import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Iterative Design
registerCard({
  code: 'VEN-051',
  flow: E(2, 'Mind'),
  spell: {
    label: 'Iterative Design',
    resolve: function* (c) {
      const loc = yield* chooseTokenLoc(c, 'Iterative Design: jogar o Mech onde?');
      if (loc) yield* c.g.playTokenG('TOK-MECH', c.p, loc);
    },
  },
});
