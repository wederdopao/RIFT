import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Patched Porobot
registerCard({
  code: 'VEN-058',
  entersReady: () => false,
  onPlay: [
    {
      label: 'Comprar 1 (3+ outros gear)',
      prepare: function* (c) {
        return c.g.gearOf(c.p).filter((o) => o.id !== c.self.id).length >= 3;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
