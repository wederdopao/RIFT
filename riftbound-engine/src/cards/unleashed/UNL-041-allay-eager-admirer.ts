import { registerCard } from '../../engine/script';

// [Deflect]. Enquanto estou num campo de batalha, as suas outras unidades aqui têm [Deflect].
registerCard({
  code: 'UNL-041',
  keywords: { deflect: 1 },
  auras: [
    {
      keywords: (g, src, t) => {
        const i = g.bfIndex(src);
        if (i < 0 || t.id === src.id || !g.isUnit(t) || t.controller !== src.controller || g.bfIndex(t) !== i) return undefined;
        return { deflect: 1 };
      },
    },
  ],
});
