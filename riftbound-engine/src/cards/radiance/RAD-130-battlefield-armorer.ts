import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-130',
  triggers: [
    {
      on: 'die',
      label: 'Pagar [1] para devolver o gear à mão',
      optional: 'Pagar [1] para devolver o gear à mão do dono?',
      cost: E(1),
      cond: (c, ev) => !!ev.obj && c.g.isGear(ev.obj) && ev.controller === c.p && ev.loc?.t === 'bf' && !ev.obj.token,
      resolve: function* (c) {
        const o = c.ev?.obj;
        if (o && o.zone === 'trash') c.g.toZone(o, 'hand');
      },
    },
  ],
});
