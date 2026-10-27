import { registerCard } from '../../engine/script';

// Reaction: dê +2 de Might a uma unidade neste turno. Compre 1.
registerCard({
  code: 'OGN-058',
  keywords: { reaction: true },
  spell: {
    label: 'Discipline',
    alwaysResolve: true, // "compre 1" vale mesmo com o alvo ilegal (regra 359.3.e.5)
    targets: [{ prompt: 'Discipline: +2 em qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, 2);
      yield* c.g.draw(c.p, 1);
    },
  },
});
