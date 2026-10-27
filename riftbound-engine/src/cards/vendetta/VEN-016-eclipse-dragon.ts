import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Eclipse Dragon
registerCard({
  code: 'VEN-016',
  keywords: { accelerate: true },
  triggers: [
    {
      on: 'move',
      label: 'Comprar 1 (4 ou menos runas)',
      cond: (c, ev) => ev.unit?.id === c.self.id && runes(c.g, c.p) <= 4,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
