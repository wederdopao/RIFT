import { registerCard } from '../../engine/script';

// Mischievous Marai. Hidden. Quando você me joga num campo de batalha, cause 2 de dano a uma unidade inimiga aqui.
// - Só dispara se fui jogada num campo (na base, não). Jogada a partir de Hidden, entra no campo onde estava escondida e
//   o alvo tem de estar nesse campo (811.1.d.3; riftboundfaq.com/mechanics/hidden#play-effect-targeting).
// - O alvo é escolhido ao pôr o gatilho na pilha; "aqui" é conferido de novo na resolução (359.3.e).
registerCard({
  code: 'UNL-003',
  keywords: { hidden: true },
  triggers: [
    {
      on: 'play',
      label: '2 de dano numa unidade inimiga aqui',
      cond: (c, ev) => ev.obj?.id === c.self.id && ev.loc?.t === 'bf',
      targets: [
        {
          prompt: 'Mischievous Marai: 2 de dano em qual unidade inimiga aqui?',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(c.self) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, 2, c.self);
      },
    },
  ],
});
