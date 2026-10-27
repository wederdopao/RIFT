import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Reaction. Dê a uma unidade -Might neste turno igual ao número de unidades exauridas que você controla.
registerCard({
  code: 'RAD-048',
  keywords: { reaction: true },
  spell: {
    label: 'High Note',
    targets: [T.anyUnit('High Note: -Might em qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      const n = c.g.units().filter((x) => x.controller === c.p && x.exhausted).length;
      if (u && n > 0) c.g.giveMight(u, -n);
    },
  },
});
