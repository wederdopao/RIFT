import { registerCard } from '../../engine/script';

// Quando eu me movo, compre 1.
registerCard({
  code: 'SFD-048',
  triggers: [
    {
      on: 'move',
      label: 'Comprar 1',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
