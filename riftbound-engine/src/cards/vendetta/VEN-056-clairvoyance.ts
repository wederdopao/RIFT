import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Clairvoyance
registerCard({
  code: 'VEN-056',
  keywords: { reaction: true },
  spell: {
    label: 'Clairvoyance',
    resolve: function* (c) {
      yield* c.g.predict(c.p, 5);
      yield* c.g.draw(c.p, 2);
    },
  },
});
