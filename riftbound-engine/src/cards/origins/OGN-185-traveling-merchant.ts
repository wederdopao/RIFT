import { registerCard } from '../../engine/script';

// Quando eu me movo, descarte 1 e depois compre 1.
registerCard({
  code: 'OGN-185',
  triggers: [
    {
      on: 'move',
      label: 'Descartar 1, comprar 1',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.discard(c.p, 1);
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
