import { registerCard } from '../../engine/script';

// Hidden. Action. Cause 3 de dano a uma unidade num campo de batalha. Jogue uma ficha de gear Gold exaurida.
// O Gold não depende do alvo: com o alvo ilegal na resolução, ainda é jogado (regras 359.3.e.1 e 359.3.e.5).
registerCard({
  code: 'SFD-070',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Wages of Pain',
    alwaysResolve: true,
    targets: [{ prompt: 'Wages of Pain: 3 de dano em qual unidade num campo?', filter: (c, o) => c.g.bfIndex(o) >= 0 }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 3, c.self);
      c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
    },
  },
});
