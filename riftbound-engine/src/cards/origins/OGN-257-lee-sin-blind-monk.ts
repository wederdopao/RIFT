import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Lenda: [1], exaurir: dê Buff a uma unidade aliada.
registerCard({
  code: 'OGN-257',
  activated: [
    {
      label: '[1], exaurir: Buff numa unidade aliada',
      exhaustSelf: true,
      cost: E(1),
      targets: [{ prompt: 'Buff em qual unidade sua?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.buff(u, c.p);
      },
    },
  ],
});
