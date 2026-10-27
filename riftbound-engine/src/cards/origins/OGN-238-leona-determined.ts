import { registerCard } from '../../engine/script';

// Shield. Quando eu ataco, atordoe uma unidade inimiga aqui.
registerCard({
  code: 'OGN-238',
  keywords: { shield: 1 },
  triggers: [
    {
      on: 'attack',
      label: 'Atordoar uma unidade inimiga aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Leona, Determined: atordoar qual unidade inimiga aqui?',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.stun(u, c.p);
      },
    },
  ],
});
