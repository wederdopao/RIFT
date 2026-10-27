import { registerCard } from '../../engine/script';

// Deathknell: canalize 1 runa exaurida.
registerCard({
  code: 'OGN-216',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: canalizar 1 runa exaurida',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        c.g.channel(c.p, 1, true);
      },
    },
  ],
});
