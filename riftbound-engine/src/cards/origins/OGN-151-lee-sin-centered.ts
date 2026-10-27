import { registerCard } from '../../engine/script';

// Accelerate. Outras unidades aliadas com Buff no meu campo têm +2 de Might.
registerCard({
  code: 'OGN-151',
  keywords: { accelerate: true },
  auras: [
    {
      might: (g, src, t) => {
        if (src.zone !== 'board' || t.id === src.id || t.controller !== src.controller || t.buffs <= 0) return 0;
        const i = g.bfIndex(src);
        return i >= 0 && g.bfIndex(t) === i ? 2 : 0;
      },
    },
  ],
});
