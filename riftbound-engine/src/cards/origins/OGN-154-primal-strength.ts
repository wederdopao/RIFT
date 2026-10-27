import { registerCard } from '../../engine/script';

// Action: dê +7 de Might a uma unidade neste turno.
registerCard({
  code: 'OGN-154',
  keywords: { action: true },
  spell: {
    label: 'Primal Strength',
    targets: [{ prompt: 'Primal Strength: +7 em qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, 7);
    },
  },
});
