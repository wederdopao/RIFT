import { registerCard } from '../../engine/script';

// Como custo adicional para me jogar, mate uma unidade aliada.
registerCard({
  code: 'OGN-208',
  mandatoryCost: {
    label: 'Cruel Patron: é preciso matar uma unidade sua para jogá-lo.',
    canPay: (g, self, p) => g.units().some((u) => u.controller === p),
    pay: function* (c) {
      const us = c.g.units().filter((u) => u.controller === c.p);
      if (!us.length) return false;
      const [u] = yield* c.g.chooseObj(c.p, 'Cruel Patron: matar qual unidade sua (custo adicional)?', us);
      yield* c.g.killG(u, 'é sacrificada');
      return true;
    },
  },
});
