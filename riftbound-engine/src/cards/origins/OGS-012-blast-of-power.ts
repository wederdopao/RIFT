import { registerCard } from '../../engine/script';
import { T } from '../helpers';
// Action: mate uma unidade num campo de batalha.
registerCard({
  code: 'OGS-012',
  keywords: { action: true },
  spell: {
    label: 'Blast of Power',
    targets: [T.unitAtBf('Blast of Power: matar qual unidade num campo?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) yield* c.g.killG(u);
    },
  },
});
