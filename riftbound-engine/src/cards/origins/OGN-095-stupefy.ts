import { registerCard } from '../../engine/script';

// Reaction: dê -1 de Might a uma unidade neste turno, até um mínimo de 1. Compre 1.
registerCard({
  code: 'OGN-095',
  keywords: { reaction: true },
  spell: {
    label: 'Stupefy',
    targets: [{ prompt: 'Stupefy: -1 de Might em qual unidade?' }],
    alwaysResolve: true, // alvo ilegal: só o -1 é ignorado, o "compre 1" ainda acontece (regras 359.3.e.5-6)
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, -1, 'turn', 1);
      yield* c.g.draw(c.p, 1);
    },
  },
});
