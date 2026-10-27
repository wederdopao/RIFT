import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-162 Protective Sands
registerCard({
  code: 'VEN-162',
  triggers: [
    {
      on: 'conquer',
      label: 'Pagar [1] para comprar 1',
      optional: 'pagar [1] para comprar 1?',
      cond: (c, ev) => ev.bf === c.g.bfOf(c.self) && ev.player === c.p && c.g.runesOf(c.p).length <= 4,
      cost: E(1),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
