import { registerCard } from '../../engine/script';
// Quando você me joga, cause 3 de dano a todas as unidades em campos de batalha.
registerCard({
  code: 'OGS-018',
  onPlay: [
    {
      label: '3 de dano em todas as unidades nos campos',
      resolve: function* (c) {
        const g = c.g;
        for (const u of g.units().filter((x) => g.bfIndex(x) >= 0)) g.dealDamage(u, 3, c.self);
      },
    },
  ],
});
