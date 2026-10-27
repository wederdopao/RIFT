import { registerCard } from '../../engine/script';

// Reaction. Anule um spell com custo de Power [Rune][Rune] ou mais.
registerCard({
  code: 'RAD-041',
  keywords: { reaction: true },
  spell: {
    label: 'Hush',
    targets: [{ prompt: 'Hush: anular qual spell (Power 2 ou mais)?', kind: 'spell', filter: (c, o) => c.g.data(o).power >= 2 }],
    resolve: function* (c) {
      const s = c.targets[0][0];
      const item = s && c.g.chain.find((it) => it.cardId === s.id);
      if (item) c.g.counter(item);
    },
  },
});
