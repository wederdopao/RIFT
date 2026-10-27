import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Cloud Drake
registerCard({
  code: 'VEN-048',
  onPlay: [
    {
      label: 'Comprar 1',
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
