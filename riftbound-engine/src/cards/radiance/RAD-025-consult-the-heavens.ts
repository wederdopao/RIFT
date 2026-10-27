import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Reaction. Dê a uma unidade Shield 2 neste turno. Predict.
registerCard({
  code: 'RAD-025',
  keywords: { reaction: true },
  spell: {
    label: 'Consult the Heavens',
    targets: [T.anyUnit('Consult the Heavens: Shield 2 em qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveKw(u, { shield: 2 });
      yield* c.g.predict(c.p, 1);
    },
  },
});
