import { registerCard } from '../../engine/script';

// Quando eu ataco, cause dano igual ao meu Might a uma unidade inimiga aqui.
registerCard({
  code: 'OGN-076',
  triggers: [
    {
      on: 'attack',
      label: 'Dano igual ao meu Might numa unidade inimiga aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Yasuo: causar dano em qual unidade inimiga aqui?',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        // Might atual na resolução (regra 359.3.f.2); fora do tabuleiro é nulo e o dano não acontece (359.3.e.12)
        if (u && c.self.zone === 'board') c.g.dealDamage(u, c.g.might(c.self), c.self);
      },
    },
  ],
});
