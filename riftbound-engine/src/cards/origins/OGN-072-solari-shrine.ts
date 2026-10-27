import { registerCard } from '../../engine/script';

// Gear. Quando você mata uma unidade inimiga atordoada, você pode exaurir isto para comprar 1.
registerCard({
  code: 'OGN-072',
  triggers: [
    {
      on: 'die',
      label: 'Exaurir para comprar 1',
      optional: 'exaurir para comprar 1?',
      cond: (c, ev) =>
        ev.killer === c.p && ev.controller !== c.p && !!ev.snap?.stunned && c.g.isUnit(ev.obj) && !c.self.exhausted,
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
