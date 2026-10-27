import { registerCard } from '../../engine/script';

// Accelerate. Deathknell: canalize 2 runas exauridas e compre 1.
registerCard({
  code: 'OGN-075',
  keywords: { accelerate: true },
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: canalizar 2 runas exauridas e comprar 1',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        c.g.channel(c.p, 2, true);
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
