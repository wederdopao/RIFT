import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Questionable Tome
registerCard({
  code: 'VEN-054',
  empower: { exhaustSelf: true },
  activated: [
    {
      label: 'Disempower, [1], Tap: comprar 1',
      exhaustSelf: true,
      cost: E(1),
      condition: (g, self) => self.empowered,
      canPayExtra: (c) => c.self.empowered,
      extraCost: function* (c) {
        return c.g.disempower(c.self);
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
