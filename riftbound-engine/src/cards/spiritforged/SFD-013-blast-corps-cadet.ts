import { registerCard } from '../../engine/script';
import { E, atBf } from '../helpers';

// Você pode pagar [1][Fury] como custo adicional para me jogar.
// Quando você me joga, se pagou o custo adicional, cause 2 de dano a uma unidade num campo de batalha.
registerCard({
  code: 'SFD-013',
  optionalCosts: [{ label: 'Pagar [1][Fury] a mais para causar 2 de dano a uma unidade num campo?', cost: E(1, 'Fury'), flag: 'paid' }],
  triggers: [
    {
      on: 'play',
      label: '2 de dano numa unidade num campo (custo adicional pago)',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.paid,
      targets: [{ prompt: 'Blast Corps Cadet: 2 de dano em qual unidade num campo?', filter: (c, o) => atBf(c, o) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, 2, c.self);
      },
    },
  ],
});
