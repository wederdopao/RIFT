import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-166 Ruined Monastery
registerCard({
  code: 'RAD-166',
  triggers: [
    {
      on: 'conquer',
      label: 'Descartar 1 e canalizar 1 runa exausta',
      optional: 'descartar 1 carta e canalizar 1 runa exausta?',
      cond: (c, ev) => ev.bf === c.g.bfOf(c.self) && ev.player === c.p,
      possible: (c) => c.g.pl[c.p].hand.length > 0,
      resolve: function* (c) {
        const d = yield* c.g.discard(c.p, 1);
        if (d.length) c.g.channel(c.p, 1, true);
      },
    },
  ],
});
