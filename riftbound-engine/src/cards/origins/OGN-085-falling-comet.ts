import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';

// Action: cause 6 de dano a uma unidade num campo de batalha.
registerCard({
  code: 'OGN-085',
  keywords: { action: true },
  spell: {
    label: 'Falling Comet',
    targets: [{ prompt: 'Falling Comet: 6 de dano em qual unidade?', filter: (c, o) => atBf(c, o) }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 6, c.self);
    },
  },
});
