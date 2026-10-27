import { registerCard } from '../../engine/script';

// Seus gear têm Deflect.
registerCard({
  code: 'RAD-037',
  auras: [{ keywords: (g, src, t) => (src.zone === 'board' && t.controller === src.controller && g.isGear(t) ? { deflect: 1 } : undefined) }],
});
