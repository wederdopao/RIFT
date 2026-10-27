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
        // "It can't move": ninguém a move neste turno; apaga um "só esse jogador não pode" anterior (noMoveBy, Vex)
        u.noMoveTurn = c.g.turn;
        u.noMoveBy = undefined;
      }
      yield* c.g.draw(c.p, 1);
    },
  },
});
