import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Você pode pagar [1] como custo adicional para me jogar. Quando você me joga, se pagou o custo adicional, me dê um Buff.
registerCard({
  code: 'SFD-098',
  optionalCosts: [{ label: 'Pagar [1] a mais para receber um Buff?', cost: E(1), flag: 'paid' }],
  triggers: [
    {
      on: 'play',
      label: 'Buff em mim (custo adicional pago)',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.paid,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.buff(c.self, c.p);
      },
    },
  ],
});
