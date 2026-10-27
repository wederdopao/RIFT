import { registerCard } from '../../engine/script';
import { opp } from '../../engine/engine';
import type { P } from '../../engine/types';

// Cada jogador descarta a mão e depois compra 4.
// Ações de "cada jogador" seguem a ordem de turno, começando pelo jogador do turno (regra 303.2.a).
registerCard({
  code: 'OGN-201',
  spell: {
    label: 'Invert Timelines',
    resolve: function* (c) {
      const g = c.g;
      const order: P[] = [g.active, opp(g.active)];
      for (const p of order) yield* g.discard(p, g.pl[p].hand.length);
      for (const p of order) {
        yield* g.draw(p, 4);
        if (g.winner !== null) return;
      }
    },
  },
});
