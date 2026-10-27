import { registerCard } from '../../engine/script';

// [Action]. Escolha um campo de batalha e uma unidade inimiga lá. Cause 4 de dano a essa unidade e 1 a cada outra
// unidade inimiga lá.
// Os dois são alvos (355.10). Na resolução, "lá" é o campo escolhido: se a unidade saiu de lá, ela erra o alvo, mas o
// campo continua válido e as outras unidades inimigas lá ainda recebem 1 (359.3.e.5).
registerCard({
  code: 'UNL-072',
  keywords: { action: true },
  spell: {
    label: 'Crescent Strike',
    targets: [
      // só campos com unidade inimiga: outro campo tornaria ilegal a escolha seguinte (355.16)
      {
        prompt: 'Crescent Strike: escolha um campo de batalha',
        kind: 'battlefield',
        bfFilter: (c, i) => c.g.unitsAtBf(i).some((u) => u.controller !== c.p),
      },
      {
        prompt: 'Crescent Strike: 4 de dano em qual unidade inimiga nesse campo?',
        filter: (c, o) => {
          const bf = c.targets[0]?.[0];
          return o.controller !== c.p && !!bf && c.g.bfIndex(o) === c.g.bfOf(bf);
        },
      },
    ],
    resolve: function* (c) {
      const g = c.g;
      const bf = c.targets[0][0];
      if (!bf) return;
      const i = g.bfOf(bf);
      const main = c.targets[1][0];
      const others = g.unitsAtBf(i).filter((u) => u.controller !== c.p && u !== main);
      if (main) g.dealDamage(main, 4, c.self);
      for (const u of others) g.dealDamage(u, 1, c.self);
    },
  },
});
