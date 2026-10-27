import { registerCard } from '../../engine/script';

// Reaction: anule (Counter) um spell que custa no máximo [4] de energia e no máximo 1 power.
// Olha o custo impresso, sem descontos nem custos adicionais (RiftJudge FAQ #3777 e #10457).
registerCard({
  code: 'OGN-045',
  keywords: { reaction: true },
  spell: {
    label: 'Defy',
    targets: [
      {
        prompt: 'Defy: anular qual spell (custo até 4 e até 1 power)?',
        kind: 'spell',
        filter: (c, o) => c.g.data(o).energy <= 4 && c.g.data(o).power <= 1,
      },
    ],
    resolve: function* (c) {
      const s = c.targets[0][0];
      const item = s && c.g.chain.find((it) => it.cardId === s.id);
      if (item) c.g.counter(item);
    },
  },
});
