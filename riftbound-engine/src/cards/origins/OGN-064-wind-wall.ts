import { registerCard } from '../../engine/script';

// Reaction: anule (Counter) um spell.
registerCard({
  code: 'OGN-064',
  keywords: { reaction: true },
  spell: {
    label: 'Wind Wall',
    targets: [{ prompt: 'Wind Wall: anular qual spell?', kind: 'spell' }],
    resolve: function* (c) {
      const s = c.targets[0][0];
      const item = s && c.g.chain.find((it) => it.cardId === s.id);
      if (item) c.g.counter(item);
    },
  },
});
