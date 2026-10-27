import { registerCard } from '../../engine/script';
// Reaction: mova até 2 unidades aliadas para a base.
registerCard({
  code: 'OGS-011',
  keywords: { reaction: true },
  spell: {
    label: 'Flash',
    targets: [
      {
        prompt: 'Flash: quais unidades suas voltam para a base? (até 2)',
        filter: (c, o) => o.controller === c.p && c.g.bfIndex(o) >= 0,
        min: 0,
        max: 2,
      },
    ],
    resolve: function* (c) {
      const us = c.targets[0];
      if (us.length) c.g.moveUnits(us, { t: 'base', p: c.p }, c.p);
    },
  },
});
