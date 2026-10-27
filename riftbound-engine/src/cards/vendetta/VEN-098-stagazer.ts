import { registerCard } from '../../engine/script';

// VEN-098 Stagazer: "Spells with [Flow] you play from your trash cost [2] less, to a minimum of [1]."
// Vale para spells com [Flow] impresso ou dado por efeito (Kennen, Storm of Shuriken: g.flowCostOf), jogados do descarte.
registerCard({
  code: 'VEN-098',
  auras: [
    {
      costModMin: (g, src, card, p) =>
        src.zone === 'board' && src.controller === p && card.zone === 'trash' && g.kind(card) === 'spell' && !!g.flowCostOf(card)
          ? { amount: 2, min: 1 }
          : undefined,
    },
  ],
});
