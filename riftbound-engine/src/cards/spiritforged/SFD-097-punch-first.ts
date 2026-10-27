import { registerCard } from '../../engine/script';

// Action: dê +5 de Might a uma unidade neste turno.
registerCard({
  code: 'SFD-097',
  keywords: { action: true },
  spell: {
    label: 'Punch First',
    targets: [{ prompt: 'Punch First: +5 de Might em qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, 5);
    },
  },
});
