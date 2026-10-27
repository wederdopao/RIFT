import { registerCard } from '../../engine/script';

// [Deflect]. Os seus Equipment em qualquer lugar têm [Quick-Draw] (texto com errata): podem ser jogados com timing
// de Reaction e, ao serem jogados, são anexados a uma unidade sua. Não muda o timing do Equip de equipamentos já em
// jogo (RiftJudge FAQ #9085 e #10839).
registerCard({
  code: 'SFD-054',
  keywords: { deflect: 1 },
  auras: [
    {
      keywordsAnywhere: (g, src, t) =>
        src.zone === 'board' && t.id !== src.id && g.isEquipment(t) && t.controller === src.controller ? { quickDraw: true } : undefined,
    },
  ],
});
