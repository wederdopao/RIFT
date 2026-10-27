import { registerCard } from '../../engine/script';
import { xpCost } from '../helpers';
// Lenda: quando você segura (hold), ganhe 1 XP. Gastar 3 XP, [Tap]: compre 1.
// Gastar XP é custo (núcleo xpCost). Sem [Reaction]: só no seu turno, com a pilha vazia e fora de showdown.
registerCard({
  code: 'UNL-203',
  triggers: [
    {
      on: 'hold',
      label: 'Hold: ganhar 1 XP',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        c.g.gainXp(c.p, 1, c.self);
      },
    },
  ],
  activated: [
    {
      ...xpCost(3),
      label: 'Gastar 3 XP, exaurir: comprar 1',
      exhaustSelf: true,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
