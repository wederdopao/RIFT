import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Você pode pagar [Calm] como custo adicional para me jogar. Quando você me joga, se pagou o custo adicional, compre 1.
registerCard({
  code: 'OGN-044',
  optionalCosts: [{ label: 'Pagar [Calm] a mais para comprar 1?', cost: E(0, 'Calm'), flag: 'paid' }],
  triggers: [
    {
      on: 'play',
      label: 'Comprar 1 (custo adicional pago)',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.paid,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
