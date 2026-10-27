import { registerCard } from '../../engine/script';

// Quando eu ataco ou defendo, dê -2 de Might a uma unidade inimiga aqui neste turno, até um mínimo de 1.
registerCard({
  code: 'OGN-119',
  triggers: [
    {
      on: ['attack', 'defend'],
      label: '-2 de Might numa unidade inimiga aqui (mínimo 1)',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Ahri: -2 de Might em qual unidade inimiga aqui?',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, -2, 'turn', 1);
      },
    },
  ],
});
