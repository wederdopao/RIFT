import { registerCard } from '../../engine/script';

// Seus Mechs têm [Vision] (inclusive eu): ao serem jogados (inclusive fichas de Mech, regra 185.2.a), predict.
registerCard({
  code: 'SFD-065',
  auras: [
    {
      keywords: (g, src, t) =>
        src.zone === 'board' && t.controller === src.controller && g.isUnit(t) && g.hasTag(t, 'Mech') ? { vision: 1 } : undefined,
    },
  ],
});
