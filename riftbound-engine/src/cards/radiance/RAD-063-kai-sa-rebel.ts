import { registerCard } from '../../engine/script';

// Disarm. Enquanto estou num showdown, seus spells têm Reaction.
registerCard({
  code: 'RAD-063',
  keywords: { disarm: 1 },
  auras: [
    {
      keywordsAnywhere: (g, src, card) => {
        const sd = g.showdown;
        if (!sd || src.zone !== 'board' || g.bfIndex(src) !== sd.bf) return undefined;
        return card.owner === src.controller && g.kind(card) === 'spell' ? { reaction: true } : undefined;
      },
    },
  ],
});
