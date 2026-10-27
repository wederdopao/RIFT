import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-156 Demacian Standard
registerCard({
  code: 'RAD-156',
  keywords: { deploy: true },
  triggers: [
    {
      on: 'attack',
      label: '+2 Might a uma das unidades atacantes',
      cond: (c, ev) => !!ev.playerLevel && ev.player === c.p && c.g.bfIndex(c.self) >= 0 && ev.bf === c.g.bfIndex(c.self),
      resolve: function* (c) {
        const g = c.g;
        const us = g.unitsAtBf(g.bfIndex(c.self), c.p).filter((u) => u.role === 'attacker');
        if (!us.length) return;
        const [u] = yield* g.chooseObj(c.p, 'Demacian Standard: +2 Might em qual atacante?', us);
        if (u) g.giveMight(u, 2, 'turn');
      },
    },
    {
      on: 'hold',
      label: 'Devolver à mão',
      optional: 'devolver Demacian Standard à mão?',
      cond: (c, ev) => ev.player === c.p && c.g.bfIndex(c.self) >= 0 && ev.bf === c.g.bfIndex(c.self),
      resolve: function* (c) {
        c.g.returnToHand(c.self);
      },
    },
  ],
});
