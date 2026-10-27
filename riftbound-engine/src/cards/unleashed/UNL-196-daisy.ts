import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { P } from '../../engine/types';
// Signature Unit (Ivern). Eu entro pronta. Reduza o meu custo em [1] para cada uma destas tags entre as suas unidades —
// Bird, Cat, Dog e Poro. Quando eu ataco enquanto as suas unidades têm as 4 tags, [Stun] uma unidade inimiga aqui.
// - O valor do desconto ([1] por tag) vem do texto impresso (cardsrealm/tcgsync; o cards.json perdeu o símbolo). Conta as
//   tags distintas entre as unidades que você controla no tabuleiro ao jogar (tags dadas por efeitos também, g.hasTag).
// - "Enquanto as suas unidades têm as 4 tags" faz parte da condição do gatilho (checada quando ataca). A unidade inimiga é
//   alvo, escolhida ao pôr o gatilho na pilha.
const TAGS = ['Bird', 'Cat', 'Dog', 'Poro'];
const tagsAmong = (g: Engine, p: P) => TAGS.filter((t) => g.units().some((u) => u.controller === p && g.hasTag(u, t))).length;
registerCard({
  code: 'UNL-196',
  entersReady: () => true,
  selfCostMod: (g, _self, p) => -tagsAmong(g, p),
  triggers: [
    {
      on: 'attack',
      label: 'Atordoar uma unidade inimiga aqui',
      cond: (c, ev) => ev.unit?.id === c.self.id && tagsAmong(c.g, c.p) === 4,
      targets: [
        {
          prompt: 'Daisy!: atordoar qual unidade inimiga aqui?',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.stun(u, c.p);
      },
    },
  ],
});
