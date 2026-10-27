import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Reaction. Prepare uma unidade aliada. Ela não pode se mover neste turno. Compre 1.
registerCard({
  code: 'RAD-034',
  keywords: { reaction: true },
  spell: {
    label: 'Hunker Down',
    targets: [T.friendlyUnit('Hunker Down: preparar qual unidade sua?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) {
        c.g.ready(u, c.p);
        u.noMoveTurn = c.g.turn;
      }
      yield* c.g.draw(c.p, 1);
    },
  },
});
