import { registerCard } from '../../engine/script';

// Compre 2. [Level 6][>] Isto custa [2] a menos. [Level 11][>] Isto custa [4] a menos, em vez disso.
// Level é palavra-chave dependente (824.1): o efeito vale enquanto quem controla a carta tem N+ XP; na mão, quem a joga
// (824.1.b.1, 824.1.c). Com 11+ XP o desconto de [4] substitui o de [2] ("instead"): não somam.
registerCard({
  code: 'UNL-091',
  selfCostMod: (g, self, p) => (g.levelReached(self, 11, p) ? -4 : g.levelReached(self, 6, p) ? -2 : 0),
  spell: {
    label: 'Concentrate',
    resolve: function* (c) {
      yield* c.g.draw(c.p, 2);
    },
  },
});
