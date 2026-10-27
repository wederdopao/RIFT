import { registerCard } from '../../engine/script';

// Hidden. Quando você me joga, você pode devolver outra unidade num campo de batalha com 3 de Might ou menos para a
// mão do dono. "Você pode" no início: decidido ao pôr o gatilho na pilha (383.3.a), com o alvo. Jogada a partir de
// Hidden, o alvo tem de estar naquele campo (811.1.d.2). O Might é checado de novo na resolução (359.3.e.2).
registerCard({
  code: 'SFD-138',
  keywords: { hidden: true },
  onPlay: [
    {
      label: 'Devolver outra unidade (Might 3 ou menos) para a mão',
      optional: 'Devolver outra unidade num campo de batalha com 3 de Might ou menos para a mão do dono?',
      targets: [
        {
          prompt: 'Windsinger: devolver qual unidade (3 de Might ou menos, num campo)?',
          filter: (c, o) => o.id !== c.self.id && c.g.bfIndex(o) >= 0 && c.g.might(o) <= 3,
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.returnToHand(u);
      },
    },
  ],
});
