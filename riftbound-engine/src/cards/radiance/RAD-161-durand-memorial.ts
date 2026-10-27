import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-161 Durand Memorial
registerCard({
  code: 'RAD-161',
  triggers: [
    {
      on: 'defend',
      label: 'Dar Tank a uma unidade sua aqui neste combate',
      cond: (c, ev) => !!ev.playerLevel && ev.player === c.p && ev.bf === c.g.bfOf(c.self),
      resolve: function* (c) {
        const g = c.g;
        const us = g.unitsAtBf(g.bfOf(c.self), c.p);
        if (!us.length) return;
        const [u] = yield* g.chooseObj(c.p, 'Durand Memorial: dar Tank a qual unidade?', us);
        if (u) g.giveKw(u, { tank: true }, 'combat');
      },
    },
  ],
});
