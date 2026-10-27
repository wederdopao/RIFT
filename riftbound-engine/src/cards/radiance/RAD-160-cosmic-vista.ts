import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-160 Cosmic Vista
registerCard({
  code: 'RAD-160',
  triggers: [
    {
      on: 'hold',
      label: 'Pontuar 1 (deck de runas vazio)',
      cond: (c, ev) => ev.bf === c.g.bfOf(c.self) && ev.player === c.p && c.g.pl[c.p].runeDeck.length === 0,
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, 'Cosmic Vista');
      },
    },
  ],
});
