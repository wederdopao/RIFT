import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';

// Hidden. Action. Cause 2 de dano a uma unidade num campo de batalha. Se ela estiver atacando, cause 4 em vez disso.
// "Atacando" = tem a designação de atacante na resolução.
registerCard({
  code: 'SFD-017',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Sudden Storm',
    targets: [{ prompt: 'Sudden Storm: dano em qual unidade num campo?', filter: (c, o) => atBf(c, o) }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, u.role === 'attacker' ? 4 : 2, c.self);
    },
  },
});
