import { registerCard } from '../../engine/script';

// Accelerate. [Assault]. As unidades aliadas jogadas de qualquer lugar que não seja a mão de um jogador têm [Accelerate].
// Vale para as unidades que o meu controlador joga de fora de uma mão (zona de campeão, descarte, deck, escondidas,
// banidas...): elas podem pagar o Accelerate ao serem jogadas (805.2).
registerCard({
  code: 'SFD-029',
  keywords: { accelerate: true, assault: 1 },
  auras: [
    {
      playKeywords: (g, src, card, p) =>
        src.zone === 'board' && src.controller === p && g.isUnit(card) && card.zone !== 'hand' ? { accelerate: true } : undefined,
    },
  ],
});
