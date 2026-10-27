import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Dredge Up
registerCard({
  code: 'VEN-049',
  flow: E(2),
  spell: {
    label: 'Dredge Up',
    resolve: function* (c) {
      yield* c.g.draw(c.p, 1);
    },
  },
});
