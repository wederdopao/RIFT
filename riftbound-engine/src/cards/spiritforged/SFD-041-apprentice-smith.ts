import { registerCard } from '../../engine/script';

// Quando eu me movo, revele a carta do topo do seu Main Deck. Se for um gear, compre-a; senão, recicle-a.
// Revelar o topo é g.revealTop (Void Hatchling, Nocturne, "As I'm revealed"). "Compre-a": é a carta do topo, então é a compra normal.
registerCard({
  code: 'SFD-041',
  triggers: [
    {
      on: 'move',
      label: 'Revelar o topo: gear vai para a mão, senão recicla',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const [o] = yield* g.revealTop(c.p, 1, c.p); // beforeReveal (Void Hatchling), onLookTop, onReveal
        if (!o || o.zone !== 'mainDeck' || g.pl[c.p].mainDeck[0] !== o.id) return;
        if (g.isGear(o)) yield* g.draw(c.p, 1);
        else g.recycleCard(o, { by: c.p });
      },
    },
  ],
});
