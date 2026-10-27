import { registerCard } from '../../engine/script';

// Quando você me joga, cause 6 de dano a uma unidade inimiga num campo de batalha.
registerCard({
  code: 'OGN-092',
  onPlay: [
    {
      label: '6 de dano numa unidade inimiga num campo',
      targets: [
        { prompt: 'Riptide Rex: 6 de dano em qual unidade inimiga?', filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, 6, c.self);
      },
    },
  ],
});
