import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Cause 10 a uma unidade. Compre 2.
registerCard({
  code: 'RAD-059',
  spell: {
    label: 'Supernova',
    targets: [T.anyUnit('Supernova: 10 de dano em qual unidade?')],
    // "Draw 2" não depende do alvo: compra mesmo se o alvo ficou ilegal (359.3.e.5, 359.3.e.10)
    alwaysResolve: true,
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 10, c.self);
      yield* c.g.draw(c.p, 2);
    },
  },
});
