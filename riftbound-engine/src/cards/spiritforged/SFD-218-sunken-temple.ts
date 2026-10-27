import { registerCard } from '../../engine/script';
import { E, bfIdx } from '../helpers';
// Campo: quando você conquista aqui com uma ou mais unidades [Mighty] (5+ de Might), você pode pagar [1] para comprar 1.
// "Com unidades Mighty" faz parte da condição (regra 383.2.a.1): vale para as suas unidades aqui no momento da
// conquista. O [1] é pago ao pôr o gatilho na pilha (383.3.b).
registerCard({
  code: 'SFD-218',
  triggers: [
    {
      on: 'conquer',
      label: 'Pagar [1] para comprar 1',
      optional: 'Pagar [1] para comprar 1?',
      cond: (c, ev) =>
        ev.bf === bfIdx(c) && ev.player === c.p && c.g.unitsAtBf(bfIdx(c), c.p).some((u) => c.g.isMighty(u)),
      cost: E(1),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
