import { registerCard } from '../../engine/script';

// Deathknell: compre 1.
registerCard({
  code: 'OGN-096',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: comprar 1',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
