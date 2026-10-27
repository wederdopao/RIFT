import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você conquista aqui, você pode gastar um Buff para comprar 1.
registerCard({
  code: 'OGN-282',
  triggers: [
    {
      on: 'conquer',
      label: 'Gastar um Buff para comprar 1',
      optional: 'Gastar um Buff de uma unidade sua para comprar 1?',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p && c.g.units().some((u) => u.controller === c.p && u.buffs > 0),
      extraCost: function* (c) {
        const us = c.g.units().filter((u) => u.controller === c.p && u.buffs > 0);
        if (!us.length) return false;
        const [u] = yield* c.g.chooseObj(c.p, 'Gastar o Buff de qual unidade?', us);
        return c.g.spendBuff(u);
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
