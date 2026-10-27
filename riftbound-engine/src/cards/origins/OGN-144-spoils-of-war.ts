import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Reaction. Se uma unidade inimiga morreu neste turno, custa 2 a menos. Compre 2.
registerCard({
  code: 'OGN-144',
  keywords: { reaction: true },
  selfCostMod: (g, self, p) => ((g.pl[(1 - p) as P].unitDeaths || 0) > 0 ? -2 : 0),
  spell: {
    label: 'Spoils of War',
    resolve: function* (c) {
      yield* c.g.draw(c.p, 2);
    },
  },
});
