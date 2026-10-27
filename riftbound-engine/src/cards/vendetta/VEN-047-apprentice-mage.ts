import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Apprentice Mage
registerCard({
  code: 'VEN-047',
  empower: E(2),
  mightMod: (g, self) => (self.empowered ? 1 : 0),
  triggers: [
    {
      on: 'empower',
      label: 'Predict 2',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.predict(c.p, 2);
      },
    },
  ],
});
