import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';
// Tank. Quando você me joga, mova uma unidade de um campo de batalha para a base dela.
registerCard({
  code: 'OGN-191',
  keywords: { tank: true },
  onPlay: [
    {
      label: 'Mover uma unidade de um campo para a base',
      targets: [{ prompt: 'Maddened Marauder: qual unidade num campo volta para a base?', filter: (c, o) => atBf(c, o) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
      },
    },
  ],
});
