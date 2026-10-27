import { registerCard } from '../../engine/script';

// Deploy. Quando você vence um combate aqui, compre 1.
registerCard({
  code: 'RAD-024',
  keywords: { deploy: true },
  triggers: [
    {
      on: 'combatWin',
      label: 'Vencer combate aqui: comprar 1',
      cond: (c, ev) => ev.player === c.p && ev.bf === c.g.bfIndex(c.self),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
