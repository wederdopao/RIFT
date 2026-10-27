import { registerCard } from '../../engine/script';
// Lenda: as suas Mechs têm [Shield] (+1 de Might enquanto defendem).
// "Suas Mechs" = unidades com a tag Mech que você controla (inclui fichas Mech), em qualquer local.
registerCard({
  code: 'SFD-181',
  auras: [
    {
      keywords: (g, src, t) =>
        g.isUnit(t) && t.zone === 'board' && t.controller === src.controller && g.hasTag(t, 'Mech') ? { shield: 1 } : undefined,
    },
  ],
});
