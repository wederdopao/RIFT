import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Covert Informant
registerCard({
  code: 'VEN-057',
  empower: E(3),
  triggers: [
    {
      on: 'move',
      label: 'Empowered: comprar 1',
      cond: (c, ev) => ev.unit?.id === c.self.id && c.self.empowered,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
