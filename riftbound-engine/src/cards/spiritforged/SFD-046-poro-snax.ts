import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Quando você joga isto, compre 1. [1][Calm], exaurir, matar isto: compre 1.
registerCard({
  code: 'SFD-046',
  onPlay: [
    {
      label: 'Comprar 1',
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
  activated: [
    {
      label: '[1][Calm], exaurir, matar isto: comprar 1',
      cost: E(1, 'Calm'),
      exhaustSelf: true,
      killSelf: true,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
