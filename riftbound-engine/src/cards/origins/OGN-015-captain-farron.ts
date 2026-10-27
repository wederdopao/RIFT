import { registerCard } from '../../engine/script';

// Outras unidades aliadas aqui têm Assault (+1 enquanto atacam).
registerCard({
  code: 'OGN-015',
  auras: [
    {
      keywords: (g, src, u) =>
        src.zone === 'board' && u.id !== src.id && u.controller === src.controller && g.isUnit(u) && g.locEq(g.locOf(u), g.locOf(src))
          ? { assault: 1 }
          : undefined,
    },
  ],
});
