import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você segura aqui, compre 1.
registerCard({
  code: 'OGN-280',
  triggers: [
    {
      on: 'hold',
      label: 'Comprar 1',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
