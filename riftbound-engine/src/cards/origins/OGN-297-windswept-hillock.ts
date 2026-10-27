import { registerCard } from '../../engine/script';
// Campo: unidades aqui têm [Ganking].
registerCard({
  code: 'OGN-297',
  auras: [
    {
      keywords: (g, src, u) => (g.isUnit(u) && g.bfIndex(u) >= 0 && g.bfIndex(u) === g.bfOf(src) ? { ganking: true } : undefined),
    },
  ],
});
