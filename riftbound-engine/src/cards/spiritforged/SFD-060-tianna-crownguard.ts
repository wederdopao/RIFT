import { registerCard } from '../../engine/script';

// [Deflect]. Enquanto estou num campo de batalha, oponentes não podem ganhar pontos (texto com errata).
// Só impede ganhar pontos: pontuar o campo (hold/conquista) continua acontecendo, com os gatilhos, e conta para o
// ponto final (RiftJudge FAQ #9179, #9615, #10137, #10355).
registerCard({
  code: 'SFD-060',
  keywords: { deflect: 1 },
  auras: [{ cantGainPoints: (g, src, p) => src.zone === 'board' && g.bfIndex(src) >= 0 && p !== src.controller }],
});
