import { registerCard } from '../../engine/script';

// Hidden. Quando você me joga, você pode escolher uma unidade sua em outro local.
// Eu vou para o local dela e ela vem para o meu local original.
// "Você pode" no começo do efeito: decidido ao pôr o gatilho na pilha (regra 383.3.a, que usa esta carta de exemplo).
registerCard({
  code: 'OGN-199',
  keywords: { hidden: true },
  onPlay: [
    {
      label: 'Trocar de lugar com uma unidade sua',
      optional: 'Trocar Tideturner de lugar com uma unidade sua em outro local?',
      targets: [
        {
          prompt: 'Tideturner: trocar de lugar com qual unidade sua?',
          filter: (c, o) => o.controller === c.p && o.id !== c.self.id && !c.g.locEq(o.loc, c.self.loc),
          // jogada a partir de Hidden: "em outro local" exclui o próprio campo, então a restrição não vale (811.1.d.2)
          ignoreHidden: true,
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        const u = c.targets[0][0];
        if (!u || c.self.zone !== 'board') return;
        const mine = c.self.loc!;
        const theirs = u.loc!;
        g.moveUnits([c.self], theirs, c.p);
        g.moveUnits([u], mine, c.p);
      },
    },
  ],
});
