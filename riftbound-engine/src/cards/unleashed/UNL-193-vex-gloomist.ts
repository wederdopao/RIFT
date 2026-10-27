import { registerCard } from '../../engine/script';
// Lenda: quando você ou um aliado seguram (hold), você pode me exaurir para comprar 1.
// No 1x1 não há aliados: dispara no seu hold. "Me exaurir para" é custo dentro da instrução (355.10.c.1), pago ao pôr o
// gatilho na pilha; "você pode" decide se ele vai (patch notes do Unleashed). Lenda já exaurida: não há como pagar.
registerCard({
  code: 'UNL-193',
  triggers: [
    {
      on: 'hold',
      label: 'Comprar 1',
      optional: 'exaurir a Vex para comprar 1?',
      cond: (c, ev) => ev.player === c.p && !c.self.exhausted,
      extraCost: function* (c) {
        if (c.self.exhausted) return false;
        c.self.exhausted = true;
        return true;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
