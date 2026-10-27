import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-157 Bandle Scouts' Academy
registerCard({
  code: 'RAD-157',
  triggers: [
    {
      on: 'hide',
      label: 'Jogar uma Gold exausta',
      cond: (c, ev) => ev.bf === c.g.bfOf(c.self) && ev.player === c.p,
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
