import { registerCard } from '../../engine/script';

// [Reaction]. Dê -10 de Might a uma unidade neste turno.
registerCard({
  code: 'UNL-066',
  keywords: { reaction: true },
  spell: {
    label: 'Moonlight Affliction',
    targets: [{ prompt: 'Moonlight Affliction: dar -10 de Might a qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, -10);
    },
  },
});
