import { registerCard } from '../../engine/script';
// VEN-160 Mystic Vortex — "During showdowns here, cards with [Reaction] cost [Rune] more to play. (Hidden cards have
// [Reaction].)" Vale para qualquer tipo de carta (unidade, gear ou spell) com [Reaction], inclusive as jogadas
// escondidas (Aura.cardCostMod).
registerCard({
  code: 'VEN-160',
  auras: [
    {
      cardCostMod: (g, src, card) => {
        const i = g.bfOf(src);
        if (i < 0 || !g.showdown || g.showdown.bf !== i) return undefined;
        const isReaction = !!g.kw(card).reaction || card.zone === 'facedown';
        return isReaction ? { powerMore: 1 } : undefined;
      },
    },
  ],
});
