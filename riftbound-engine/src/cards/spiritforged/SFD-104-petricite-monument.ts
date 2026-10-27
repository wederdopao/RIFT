import { registerCard } from '../../engine/script';

// Temporary. Unidades aliadas têm Deflect.
registerCard({
  code: 'SFD-104',
  keywords: { temporary: true },
  auras: [
    {
      keywords: (g, src, t) => (src.zone === 'board' && t.controller === src.controller && g.isUnit(t) ? { deflect: 1 } : undefined),
    },
  ],
});
