import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-081',
  keywords: { hidden: true },
  triggers: [
    {
      on: 'play',
      label: '+3 de Might em outra unidade aliada; recicla se foi jogada escondida',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      alwaysResolve: true,
      targets: (c) => [
        {
          prompt: 'Elnuk Herd: +3 de Might em qual outra unidade aliada?',
          filter: (cc, o) => o.controller === cc.p && o.id !== cc.self.id,
          min: c.g.units().some((o) => o.controller === c.p && o.id !== c.self.id) ? 1 : 0,
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0]?.[0];
        if (u) c.g.giveMight(u, 3);
        if (c.ev?.via === 'hidden' && c.self.zone === 'board') c.g.recycleCard(c.self, { by: c.p });
      },
    },
  ],
});
