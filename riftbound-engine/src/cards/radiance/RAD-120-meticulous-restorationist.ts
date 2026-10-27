import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-120',
  triggers: [
    {
      on: 'cardPlayed',
      zone: 'trash',
      label: 'Jogar do descarte por [Order]',
      cond: (c, ev) => ev.player === c.p && ev.obj?.id !== c.self.id && !!ev.obj && c.g.data(ev.obj).energy >= 7,
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'trash' || !g.canPay(c.p, E(0, 'Order'))) return;
        if (!(yield* g.yesNo(c.p, 'Pagar [Order] para jogar Meticulous Restorationist do descarte?'))) return;
        yield* g.playFromEffect(c.p, c.self, E(0, 'Order'));
      },
    },
  ],
});
