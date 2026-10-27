import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Reaction. Repeat [2]. Dê -2 de Might a uma unidade neste turno.
registerCard({
  code: 'SFD-066',
  keywords: { reaction: true },
  repeat: E(2),
  spell: {
    label: 'Frigid Touch',
    targets: [{ prompt: 'Frigid Touch: dar -2 de Might a qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, -2);
    },
  },
});
