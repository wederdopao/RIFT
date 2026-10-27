import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Quando você joga uma carta, compre 2. Quando você compra 1+ cartas com 9+ outras na mão: descarte a mão, mate isto, um oponente marca 1 ponto.
registerCard({
  code: 'RAD-069',
  triggers: [
    {
      on: 'cardPlayed',
      label: 'Comprar 2',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 2);
      },
    },
    {
      on: 'draw',
      label: 'Descartar a mão, matar isto; o oponente marca 1 ponto',
      cond: (c, ev) => ev.player === c.p && c.g.pl[c.p].hand.length >= 10,
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'board') return;
        g.discardObjs(c.p, g.pl[c.p].hand.map((id) => g.objs[id]));
        yield* g.killG(c.self);
        g.gainPoints((1 - c.p) as P, 1, 'Zero Point Inflection');
      },
    },
  ],
});
