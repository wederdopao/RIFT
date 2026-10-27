import { registerCard } from '../../engine/script';

// Shield, Tank. Outras unidades aliadas aqui têm Shield.
registerCard({
  code: 'OGN-074',
  keywords: { shield: 1, tank: true },
  auras: [
    {
      keywords: (g, src, t) =>
        src.zone === 'board' && t.zone === 'board' && t.id !== src.id && t.controller === src.controller &&
        g.isUnit(t) && g.locEq(t.loc, src.loc)
          ? { shield: 1 }
          : undefined,
    },
  ],
});
