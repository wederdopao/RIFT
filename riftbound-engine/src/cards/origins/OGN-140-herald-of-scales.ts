import { registerCard } from '../../engine/script';

// O custo de energia dos seus Dragões é reduzido em 2, até um mínimo de 1.
registerCard({
  code: 'OGN-140',
  auras: [
    {
      // desconto com mínimo próprio (356.4.e): o motor aplica na ordem de descontos que for melhor para o jogador,
      // depois dos custos adicionais (Accelerate etc.)
      costModMin: (g, src, card, p) =>
        src.zone === 'board' && p === src.controller && g.data(card).tags.includes('Dragon') ? { amount: 2, min: 1 } : undefined,
    },
  ],
});
