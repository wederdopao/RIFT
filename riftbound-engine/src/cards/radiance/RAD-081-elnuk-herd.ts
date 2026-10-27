import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

// Errata do Radiance (09/10/2026): "give a friendly unit +3 [Might] this turn" (era "another friendly unit"): pode ser
// eu mesmo (riftboundfaq.com/cards/elnuk-herd; riftcompare.com, Radiance Patch Notes & Errata). "then recycle me" vale
// mesmo que o alvo fique ilegal (359.3.e.1/359.3.e.6).
registerCard({
  code: 'RAD-081',
  keywords: { hidden: true },
  triggers: [
    {
      on: 'play',
      label: '+3 de Might em uma unidade aliada; recicla se foi jogada escondida',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      alwaysResolve: true,
      targets: (c) => [
        {
          prompt: 'Elnuk Herd: +3 de Might em qual unidade aliada?',
          filter: (cc, o) => o.controller === cc.p,
          min: c.g.units().some((o) => o.controller === c.p) ? 1 : 0,
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
