import { registerCard } from '../../engine/script';

// Deploy. Unidades aliadas aqui têm Assault.
registerCard({
  code: 'RAD-002',
  keywords: { deploy: true },
  auras: [
    {
      keywords: (g, src, t) => {
        const i = g.bfIndex(src);
        return src.zone === 'board' && i >= 0 && t.controller === src.controller && g.isUnit(t) && g.bfIndex(t) === i ? { assault: 1 } : undefined;
      },
    },
  ],
});
