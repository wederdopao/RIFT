import { registerCard } from '../../engine/script';

// Quando você me joga, devolva outra unidade aliada e uma unidade inimiga para a mão dos donos.
// As duas são alvos escolhidos ao pôr o gatilho na pilha; sem uma delas o gatilho não vai para a pilha e eu fico
// em jogo (FAQ riftjudge #9608, #9889, #10999). Se uma deixar de ser alvo válido, a outra ainda volta (359.3.e.5).
registerCard({
  code: 'SFD-132',
  onPlay: [
    {
      label: 'Devolver outra unidade aliada e uma inimiga para a mão',
      targets: [
        { prompt: 'Beast Below: devolver qual outra unidade aliada?', filter: (c, o) => o.controller === c.p && o.id !== c.self.id },
        { prompt: 'Beast Below: devolver qual unidade inimiga?', filter: (c, o) => o.controller !== c.p },
      ],
      resolve: function* (c) {
        for (const u of [c.targets[0][0], c.targets[1][0]]) if (u) c.g.returnToHand(u);
      },
    },
  ],
});
