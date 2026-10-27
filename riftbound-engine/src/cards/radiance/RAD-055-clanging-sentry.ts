import { registerCard } from '../../engine/script';

// Seus Mechs têm Disarm.
registerCard({
  code: 'RAD-055',
  auras: [{ keywords: (g, src, t) => (src.zone === 'board' && t.controller === src.controller && g.isUnit(t) && g.hasTag(t, 'Mech') ? { disarm: 1 } : undefined) }],
});
