import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// [Action]. [Repeat][2]. Atordoe (Stun) uma unidade atacante.
registerCard({
  code: 'SFD-040',
  keywords: { action: true },
  repeat: E(2),
  spell: {
    label: 'Thwonk!',
    targets: [{ prompt: 'Thwonk!: atordoar qual unidade atacante?', filter: (c, o) => o.role === 'attacker' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.stun(u, c.p);
    },
  },
});
