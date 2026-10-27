import { registerCard } from '../../engine/script';

// Se você tiver duas ou menos cartas na mão, eu entro pronta. Quando eu seguro (hold), compre 2.
// A mão é contada quando a unidade entra (ela mesma já saiu da mão).
registerCard({
  code: 'SFD-027',
  entersReady: (g, self) => g.pl[self.controller].hand.length <= 2,
  triggers: [
    {
      on: 'hold',
      label: 'Hold: comprar 2',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 2);
      },
    },
  ],
});
