import { registerCard } from '../../engine/script';
import { T } from '../helpers';
// Action: cause 2 a uma unidade num campo de batalha.
registerCard({
  code: 'OGS-003',
  keywords: { action: true },
  spell: {
    label: 'Incinerate',
    targets: [T.unitAtBf('Incinerate: 2 de dano em qual unidade num campo?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 2, c.self);
    },
  },
});
