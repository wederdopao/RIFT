import { registerCard } from '../../engine/script';

// Reaction. Como custo adicional, você pode exaurir uma unidade aliada. Se fizer, compre 2; senão, compre 1.
registerCard({
  code: 'OGN-048',
  keywords: { reaction: true },
  optionalCosts: [
    {
      label: 'Exaurir uma unidade sua para comprar 2 em vez de 1?',
      flag: 'exhausted',
      canPay: (g, self, p) => g.units().some((u) => u.controller === p && !u.exhausted),
      pay: function* (c) {
        const ready = c.g.units().filter((u) => u.controller === c.p && !u.exhausted);
        if (!ready.length) return false;
        const [u] = yield* c.g.chooseObj(c.p, 'Meditation: exaurir qual unidade sua?', ready);
        c.g.exhaust(u);
        c.g.say(`${c.g.name(u)} é exaurida (Meditation).`, c.p);
        return true;
      },
    },
  ],
  spell: {
    label: 'Meditation',
    resolve: function* (c) {
      yield* c.g.draw(c.p, c.data.exhausted ? 2 : 1);
    },
  },
});
