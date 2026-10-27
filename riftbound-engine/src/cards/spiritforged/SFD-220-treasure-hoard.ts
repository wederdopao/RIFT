import { registerCard } from '../../engine/script';
import { E, bfIdx } from '../helpers';
// Campo: quando você conquista aqui, você pode pagar [1] para jogar uma ficha de gear Gold exaurida (na sua base).
registerCard({
  code: 'SFD-220',
  triggers: [
    {
      on: 'conquer',
      label: 'Pagar [1] para jogar uma ficha Gold exaurida',
      optional: 'Pagar [1] para jogar uma ficha Gold exaurida?',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      cost: E(1),
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
