import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';

// Hidden, Action: mate uma unidade num campo de batalha. O controlador dela compra 2.
registerCard({
  code: 'OGN-213',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Hidden Blade',
    targets: [{ prompt: 'Hidden Blade: matar qual unidade num campo?', filter: (c, o) => atBf(c, o) }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      const ctrl = u.controller;
      yield* c.g.killG(u);
      yield* c.g.draw(ctrl, 2);
    },
  },
});
