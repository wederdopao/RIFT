import { registerCard } from '../../engine/script';

// [Reaction]. Dê -4 de Might a uma unidade neste turno. [Predict].
// Se o alvo ficar inválido, só o -4 é ignorado: o spell resolve e o [Predict] acontece (359.3.e.1 e 359.3.e.5, exemplo
// do Void Seeker: "Void Seeker's controller still draws 1").
registerCard({
  code: 'UNL-063',
  keywords: { reaction: true },
  spell: {
    label: 'Eclipse',
    alwaysResolve: true,
    targets: [{ prompt: 'Eclipse: dar -4 de Might a qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, -4);
      yield* c.g.predict(c.p, 1);
    },
  },
});
