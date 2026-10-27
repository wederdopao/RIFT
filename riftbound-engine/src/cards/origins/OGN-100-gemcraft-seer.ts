import { registerCard } from '../../engine/script';

// Vision. Outras unidades aliadas têm Vision.
registerCard({
  code: 'OGN-100',
  keywords: { vision: 1 },
  auras: [
    {
      keywords: (g, src, u) =>
        u.id !== src.id && u.controller === src.controller && src.zone === 'board' && g.isUnit(u) ? { vision: 1 } : undefined,
    },
  ],
});
