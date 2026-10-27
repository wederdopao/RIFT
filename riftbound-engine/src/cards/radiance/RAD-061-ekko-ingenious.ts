import { registerCard } from '../../engine/script';

// Como custo adicional, devolva uma unidade aliada à mão. Ganking.
registerCard({
  code: 'RAD-061',
  keywords: { ganking: true },
  mandatoryCost: {
    label: 'Ekko, Ingenious: é preciso devolver uma unidade sua à mão para jogá-lo.',
    canPay: (g, self, p) => g.units().some((u) => u.controller === p),
    pay: function* (c) {
      const us = c.g.units().filter((u) => u.controller === c.p);
      if (!us.length) return false;
      const [u] = yield* c.g.chooseObj(c.p, 'Ekko: devolver qual unidade sua à mão?', us);
      c.g.returnToHand(u);
      return true;
    },
  },
});
