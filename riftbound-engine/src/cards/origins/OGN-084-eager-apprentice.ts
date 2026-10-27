import { registerCard } from '../../engine/script';

// Enquanto estou num campo de batalha, o custo de energia dos spells que você joga cai em 1, até um mínimo de 1.
registerCard({
  code: 'OGN-084',
  auras: [
    {
      // cada Aprendiz aplica o próprio desconto com o próprio mínimo de 1 (regra 356.4.e), sobre o custo já com os
      // custos adicionais (Repeat...) e na melhor ordem entre os descontos
      costModMin: (g, src, card, p) =>
        src.zone === 'board' && src.controller === p && g.bfIndex(src) >= 0 && g.kind(card) === 'spell' ? { amount: 1, min: 1 } : undefined,
    },
  ],
});
