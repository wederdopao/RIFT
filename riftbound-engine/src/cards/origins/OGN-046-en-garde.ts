import { registerCard } from '../../engine/script';

// Reaction: dê +1 de Might a uma unidade aliada neste turno e mais +1 se ela for a única unidade sua ali.
registerCard({
  code: 'OGN-046',
  keywords: { reaction: true },
  spell: {
    label: 'En Garde',
    targets: [{ prompt: 'En Garde: +1 em qual unidade sua?', filter: (c, o) => o.controller === c.p }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      c.g.giveMight(u, 1);
      if (c.g.isAlone(u)) c.g.giveMight(u, 1);
    },
  },
});
