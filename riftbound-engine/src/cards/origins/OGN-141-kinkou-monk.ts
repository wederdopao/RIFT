import { registerCard } from '../../engine/script';

// Quando você me joga, dê Buff a até duas outras unidades aliadas.
registerCard({
  code: 'OGN-141',
  onPlay: [
    {
      label: 'Buff em até duas outras unidades aliadas',
      targets: [
        {
          prompt: 'Kinkou Monk: Buff em até duas outras unidades suas',
          filter: (c, o) => o.controller === c.p && o.id !== c.self.id,
          min: 0,
          max: 2,
        },
      ],
      resolve: function* (c) {
        for (const u of c.targets[0] || []) c.g.buff(u, c.p);
      },
    },
  ],
});
