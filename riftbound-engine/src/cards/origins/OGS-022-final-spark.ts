import { registerCard } from '../../engine/script';
import { T } from '../helpers';
// Action. Cause 8 de dano a uma unidade.
registerCard({
  code: 'OGS-022',
  keywords: { action: true },
  spell: {
    label: 'Final Spark',
    targets: [T.anyUnit('Final Spark: 8 de dano em qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 8, c.self);
    },
  },
});
