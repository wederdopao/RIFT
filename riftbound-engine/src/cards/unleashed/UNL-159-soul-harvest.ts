import { registerCard } from '../../engine/script';

// Mate uma unidade num campo de batalha com 3 de Might ou menos.
// Alvo escolhido ao jogar; na resolução tem de continuar num campo e com 3 ou menos (359.3.e.4: "uma unidade com 3 ou
// menos de Might deixa de ser alvo válido se o Might passar de 3").
registerCard({
  code: 'UNL-159',
  spell: {
    label: 'Soul Harvest',
    targets: [
      {
        prompt: 'Soul Harvest: matar qual unidade num campo de batalha com 3 de Might ou menos?',
        filter: (c, o) => c.g.bfIndex(o) >= 0 && c.g.might(o) <= 3,
      },
    ],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) yield* c.g.killG(u);
    },
  },
});
