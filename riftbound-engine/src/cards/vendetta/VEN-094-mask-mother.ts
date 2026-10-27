import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-094',
  triggers: [
    {
      on: 'discard',
      zone: 'trash',
      label: 'Mask Mother: pagar [1] para +2 Might numa unidade aliada',
      optional: 'Mask Mother: pagar [1] para dar +2 Might a uma unidade aliada?',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      cost: E(1),
      targets: [T.friendlyUnit('Mask Mother: +2 Might em qual unidade aliada?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 2);
      },
    },
  ],
});
