import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';
// Action: descarte 1. Cause dano igual ao custo de energia dela a uma unidade num campo.
registerCard({
  code: 'OGN-008',
  keywords: { action: true },
  spell: {
    label: 'Get Excited!',
    alwaysResolve: true, // o descarte não depende do alvo (regra 359.3.e.5)
    targets: [{ prompt: 'Get Excited!: unidade num campo', filter: (c, o) => atBf(c, o) }],
    resolve: function* (c) {
      const [d] = yield* c.g.discard(c.p, 1, 'Get Excited!: descarte 1 (o custo de energia vira dano)');
      const u = c.targets[0][0];
      if (d && u) c.g.dealDamage(u, c.g.data(d).energy, c.self);
    },
  },
});
