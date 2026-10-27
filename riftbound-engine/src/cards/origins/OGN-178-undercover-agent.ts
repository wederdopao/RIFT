import { registerCard } from '../../engine/script';

// Deathknell: descarte 2, depois compre 2.
registerCard({
  code: 'OGN-178',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: descartar 2, comprar 2',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.discard(c.p, 2);
        yield* c.g.draw(c.p, 2);
      },
    },
  ],
});
