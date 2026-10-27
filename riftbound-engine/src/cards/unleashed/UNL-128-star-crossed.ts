import { registerCard } from '../../engine/script';

// Reaction. Devolva uma unidade aliada e uma unidade inimiga para a mão dos donos.
// - As duas são alvos (355.7), escolhidas ao jogar; é preciso ter as duas para jogar (355.8). Se uma ficar ilegal antes de
//   resolver, a outra ainda volta (359.3.e.5). Fichas deixam de existir ao sair do tabuleiro (186.1).
registerCard({
  code: 'UNL-128',
  keywords: { reaction: true },
  spell: {
    label: 'Star-Crossed',
    targets: [
      { prompt: 'Star-Crossed: devolver qual unidade aliada?', filter: (c, o) => o.controller === c.p },
      { prompt: 'Star-Crossed: devolver qual unidade inimiga?', filter: (c, o) => o.controller !== c.p },
    ],
    resolve: function* (c) {
      for (const grp of c.targets) for (const u of grp) c.g.returnToHand(u);
    },
  },
});
