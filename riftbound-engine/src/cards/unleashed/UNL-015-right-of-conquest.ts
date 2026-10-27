import { registerCard } from '../../engine/script';

// Right of Conquest. Compre 1, depois compre 1 para cada campo de batalha que você ou aliados controlam (no 1x1 não há
// aliados). Os campos são contados depois da primeira compra, na resolução.
registerCard({
  code: 'UNL-015',
  spell: {
    label: 'Right of Conquest',
    resolve: function* (c) {
      const g = c.g;
      yield* g.draw(c.p, 1);
      const n = g.bfs.filter((b) => b.controller === c.p).length;
      if (n) yield* g.draw(c.p, n);
    },
  },
});
