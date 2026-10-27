import { registerCard } from '../../engine/script';

// Reaction. Como custo adicional, exaure uma unidade aliada. Compre 1 e canalize 1 runa exausta.
registerCard({
  code: 'RAD-029',
  keywords: { reaction: true },
  mandatoryCost: {
    label: 'Life from Stone: é preciso exaurir uma unidade sua para jogá-lo.',
    canPay: (g, self, p) => g.units().some((u) => u.controller === p && !u.exhausted),
    pay: function* (c) {
      const us = c.g.units().filter((u) => u.controller === c.p && !u.exhausted);
      if (!us.length) return false;
      const [u] = yield* c.g.chooseObj(c.p, 'Life from Stone: exaurir qual unidade sua?', us);
      c.g.exhaust(u);
      return true;
    },
  },
  spell: {
    label: 'Life from Stone',
    resolve: function* (c) {
      yield* c.g.draw(c.p, 1);
      c.g.channel(c.p, 1, true);
    },
  },
});
