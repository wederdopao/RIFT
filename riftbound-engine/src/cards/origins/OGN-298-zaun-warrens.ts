import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você conquista aqui, descarte 1 e depois compre 1.
registerCard({
  code: 'OGN-298',
  triggers: [
    {
      on: 'conquer',
      label: 'Descartar 1, comprar 1',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        yield* c.g.discard(c.p, 1);
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
