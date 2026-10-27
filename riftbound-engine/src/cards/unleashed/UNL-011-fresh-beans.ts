import { registerCard } from '../../engine/script';

// Fresh Beans (gear). Quando você joga uma unidade durante um showdown, você pode exaurir isto para comprar 1.
// - Qualquer showdown (com ou sem combate), em qualquer campo, e qualquer unidade que você jogue (fichas também são
//   jogadas, 185.2.a) (RiftJudge #8760).
// - "Você pode exaurir isto para...": o custo logo depois do "você pode" é o custo-base do gatilho, decidido e pago ao
//   pô-lo na pilha (383.3.b; patch notes do Unleashed). Exaurida, não há como pagar: o gatilho não vai para a pilha.
registerCard({
  code: 'UNL-011',
  triggers: [
    {
      on: 'play',
      label: 'Exaurir para comprar 1',
      optional: 'exaurir Fresh Beans para comprar 1?',
      cond: (c, ev) => !ev.spell && ev.player === c.p && !!ev.obj && c.g.isUnit(ev.obj) && !!c.g.showdown && !c.self.exhausted,
      canPayExtra: (c) => !c.self.exhausted,
      extraCost: function* (c) {
        if (c.self.zone !== 'board' || c.self.exhausted) return false;
        c.g.exhaust(c.self);
        return true;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
