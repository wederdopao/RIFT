import { registerCard } from '../../engine/script';
import { E, atBf } from '../helpers';
// [1], [Tap]: mova uma unidade aliada num campo de batalha para a base dela.
registerCard({
  code: 'OGN-184',
  activated: [
    {
      label: 'Mover uma unidade sua de um campo para a base',
      exhaustSelf: true,
      cost: E(1),
      targets: [{ prompt: 'The Syren: qual unidade sua num campo volta para a base?', filter: (c, o) => o.controller === c.p && atBf(c, o) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
      },
    },
  ],
});
