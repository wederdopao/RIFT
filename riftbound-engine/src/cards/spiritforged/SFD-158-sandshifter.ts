import { registerCard } from '../../engine/script';

// Quando você me joga, mate uma unidade inimiga com 3 de Might ou menos.
// A unidade é alvo, escolhido ao pôr o efeito na pilha (355.5); a restrição de Might é checada de novo na resolução.
registerCard({
  code: 'SFD-158',
  onPlay: [
    {
      label: 'Matar uma unidade inimiga com 3 de Might ou menos',
      targets: [{ prompt: 'Sandshifter: matar qual unidade inimiga (3 de Might ou menos)?', filter: (c, o) => o.controller !== c.p && c.g.might(o) <= 3 }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) yield* c.g.killG(u);
      },
    },
  ],
});
