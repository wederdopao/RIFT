import { registerCard } from '../../engine/script';

// Accelerate. Quando eu conquisto, compre 1.
registerCard({
  code: 'OGN-039',
  keywords: { accelerate: true },
  triggers: [
    {
      on: 'conquer',
      label: 'Comprar 1',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
