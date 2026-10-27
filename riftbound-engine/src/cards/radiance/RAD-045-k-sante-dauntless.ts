import { registerCard } from '../../engine/script';

// Shield. Quando ataco ou defendo, dobre o Shield de uma unidade sua aqui neste turno.
registerCard({
  code: 'RAD-045',
  keywords: { shield: 1 },
  triggers: [
    {
      on: ['attack', 'defend'],
      label: 'Dobrar o Shield de uma unidade sua aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: "K'Sante: dobrar o Shield de qual unidade sua aqui?",
          filter: (c, o) => o.controller === c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u) return;
        const n = c.g.kw(u).shield || 0;
        if (n > 0) c.g.giveKw(u, { shield: n });
      },
    },
  ],
});
