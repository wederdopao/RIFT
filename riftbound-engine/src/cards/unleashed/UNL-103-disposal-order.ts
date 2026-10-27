import { registerCard } from '../../engine/script';
import type { TargetSpec } from '../../engine/script';
import type { P } from '../../engine/types';

// [Reaction]. Escolha um — • Escolha até 3 cartas dos descartes dos oponentes. Os donos as reciclam. • Compre 1.
// - O modo é escolhido ao jogar (355.3). As cartas do descarte (zona pública) são alvos (355.10.a), de 0 a 3 (355.13).
// - Quem recicla é o dono de cada carta (o jogador instruído: "Their owners recycle them"); várias ao mesmo tempo vão
//   para o fundo do deck em ordem aleatória (416.5). Carta que saiu do descarte antes da resolução não é afetada.
const TRASH: TargetSpec = {
  prompt: 'Disposal Order: quais cartas dos descartes dos oponentes? (até 3)',
  kind: 'trash',
  filter: (c, o) => o.owner !== c.p && o.zone === 'trash',
  min: 0,
  max: 3,
};
registerCard({
  code: 'UNL-103',
  keywords: { reaction: true },
  spell: {
    label: 'Disposal Order',
    prepare: function* (c) {
      const [m] = yield* c.g.ask(c.p, 'choose', 'Disposal Order: escolha um modo', [
        { id: 'recycle', label: 'Escolher até 3 cartas dos descartes dos oponentes; os donos as reciclam' },
        { id: 'draw', label: 'Comprar 1' },
      ]);
      c.data[`mode${c.rep}`] = m;
      return true;
    },
    targets: (c) => (c.data[`mode${c.rep}`] === 'recycle' ? [TRASH] : []),
    resolve: function* (c) {
      const g = c.g;
      if (c.data[`mode${c.rep}`] === 'draw') return yield* g.draw(c.p, 1);
      const cards = (c.targets[0] || []).filter((o) => o.zone === 'trash');
      for (const owner of [0, 1] as P[]) {
        const mine = cards.filter((o) => o.owner === owner);
        if (mine.length) yield* g.recycleCards(mine, { by: owner });
      }
      if (cards.length) g.say(`Disposal Order: ${cards.length} carta(s) recicladas do descarte.`, c.p);
    },
  },
});
