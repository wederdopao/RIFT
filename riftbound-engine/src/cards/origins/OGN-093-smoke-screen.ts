import { registerCard } from '../../engine/script';

// Reaction: dê -4 de Might a uma unidade neste turno, até um mínimo de 1.
registerCard({
  code: 'OGN-093',
  keywords: { reaction: true },
  spell: {
    label: 'Smoke Screen',
    targets: [{ prompt: 'Smoke Screen: -4 de Might em qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, -4, 'turn', 1);
    },
  },
});
