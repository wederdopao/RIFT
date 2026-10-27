import { registerCard } from '../../engine/script';
// VEN-165 Shadow Temple
registerCard({
  code: 'VEN-165',
  triggers: [
    {
      on: 'hold',
      label: 'Burn 3',
      cond: (c, ev) => ev.bf === c.g.bfOf(c.self) && ev.player === c.p,
      resolve: function* (c) {
        c.g.burn(c.p, 3);
      },
    },
  ],
});
