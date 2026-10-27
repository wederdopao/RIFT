import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Campeã 6. Enquanto estou num showdown, seus spells têm [Repeat] [2][Caos].
// - O custo do Repeat vem do texto impresso (arte oficial: "REPEAT 2 + Caos"); o cards.json perdeu os ícones.
// - "Num showdown": há um showdown (ou combate, que é um showdown) em andamento no campo onde estou (308.1).
// - Repeat é custo adicional opcional decidido ao jogar o spell (820.1.c.1); é outra instância além do Repeat impresso,
//   paga à parte (820.3). Gancho do motor: Aura.repeatGrant.
registerCard({
  code: 'UNL-146',
  auras: [
    {
      repeatGrant: (g, src, card, p) => {
        if (src.zone !== 'board' || src.controller !== p || g.kind(card) !== 'spell') return undefined;
        const sd = g.showdown;
        return sd && g.bfIndex(src) === sd.bf ? E(2, 'Chaos') : undefined;
      },
    },
  ],
});
