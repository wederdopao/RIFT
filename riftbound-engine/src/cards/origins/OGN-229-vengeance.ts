import { registerCard } from '../../engine/script';

// Mate uma unidade.
registerCard({
  code: 'OGN-229',
  spell: {
    label: 'Vengeance',
    targets: [{ prompt: 'Vengeance: matar qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) yield* c.g.killG(u);
    },
  },
});
