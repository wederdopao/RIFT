import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';

// Action: cause 3 de dano a uma unidade num campo.
registerCard({
  code: 'OGN-009',
  keywords: { action: true },
  spell: {
    label: 'Hextech Ray',
    targets: [{ prompt: 'Hextech Ray: 3 de dano em qual unidade num campo?', filter: (c, o) => atBf(c, o) }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 3, c.self);
    },
  },
});
