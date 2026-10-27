import { registerCard } from '../../engine/script';

// Quando eu ataco, cause 1 de dano a uma unidade inimiga aqui.
registerCard({
  code: 'OGN-130',
  triggers: [
    {
      on: 'attack',
      label: '1 de dano numa unidade inimiga aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Crackshot Corsair: 1 de dano em qual unidade inimiga aqui?',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(c.self) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, 1, c.self);
      },
    },
  ],
});
