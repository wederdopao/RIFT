import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-113',
  keywords: { deflect: 1 },
  activated: [
    {
      label: 'O oponente move uma unidade para o meu campo',
      exhaustSelf: true,
      condition: (g, self) => g.bfIndex(self) >= 0,
      resolve: function* (c) {
        const g = c.g;
        const i = g.bfIndex(c.self);
        if (i < 0) return;
        const opp = (1 - c.p) as any;
        const us = g.units().filter((u) => u.controller === opp && !(u.loc?.t === 'bf' && u.loc.i === i));
        if (!us.length) return;
        const [u] = yield* g.chooseObj(opp, 'Angler Wyrm: mova uma unidade sua para o campo da Angler Wyrm', us);
        if (u) g.moveUnits([u], { t: 'bf', i }, opp);
      },
    },
  ],
});
