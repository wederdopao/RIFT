import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';
// Action: cause 4 de dano a uma unidade num campo. Compre 1.
registerCard({
  code: 'OGN-024',
  keywords: { action: true },
  spell: {
    label: 'Void Seeker',
    alwaysResolve: true, // "compre 1" vale mesmo com o alvo ilegal (regra 359.3.e.5)
    targets: [{ prompt: 'Void Seeker: 4 de dano em qual unidade?', filter: (c, o) => atBf(c, o) }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 4, c.self);
      yield* c.g.draw(c.p, 1);
    },
  },
});
