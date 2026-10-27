import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Xerath, Freed. [Fury], [Tap]: cause 3 de dano a uma unidade. Use só enquanto estou num campo de batalha.
// - Sem [Action]/[Reaction]: só na fase principal do seu turno, estado neutro aberto. Alvo: qualquer unidade.
registerCard({
  code: 'UNL-026',
  activated: [
    {
      label: '3 de dano numa unidade',
      cost: E(0, 'Fury'),
      exhaustSelf: true,
      condition: (g, self) => g.bfIndex(self) >= 0,
      targets: [{ prompt: 'Xerath, Freed: 3 de dano em qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, 3, c.self);
      },
    },
  ],
});
