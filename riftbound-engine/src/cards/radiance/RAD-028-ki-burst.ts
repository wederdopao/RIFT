import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Action. Como custo adicional, exaure uma unidade aliada. Stun uma unidade.
registerCard({
  code: 'RAD-028',
  keywords: { action: true },
  mandatoryCost: {
    label: 'Ki Burst: é preciso exaurir uma unidade sua para jogá-lo.',
    canPay: (g, self, p) => g.units().some((u) => u.controller === p && !u.exhausted),
    pay: function* (c) {
      const us = c.g.units().filter((u) => u.controller === c.p && !u.exhausted);
      if (!us.length) return false;
      const [u] = yield* c.g.chooseObj(c.p, 'Ki Burst: exaurir qual unidade sua?', us);
      c.g.exhaust(u);
      return true;
    },
  },
  spell: {
    label: 'Ki Burst',
    targets: [T.anyUnit('Ki Burst: atordoar qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.stun(u, c.p);
    },
  },
});
