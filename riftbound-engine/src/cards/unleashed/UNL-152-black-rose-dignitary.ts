import { registerCard } from '../../engine/script';

// [Assault] (+1 de Might enquanto ataco). [Deathknell] Canalize 1 runa exaurida.
registerCard({
  code: 'UNL-152',
  keywords: { assault: 1 },
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
