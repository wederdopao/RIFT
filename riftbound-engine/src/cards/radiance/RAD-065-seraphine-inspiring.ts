import { registerCard } from '../../engine/script';

// Disarm 2. Uma vez por turno, quando você exaure três ou mais unidades aliadas ao mesmo tempo, pode comprar 1.
registerCard({
  code: 'RAD-065',
  keywords: { disarm: 2 },
  triggers: [
    {
      on: 'exhaust',
      label: 'Exaurir 3+ unidades: comprar 1',
      optional: 'Comprar 1 carta?',
      cond: (c, ev) => {
        if (ev.player !== c.p || (ev.units?.length ?? 0) < 3 || c.self.data?.serTurn === c.g.turn) return false;
        c.self.data = { ...(c.self.data || {}), serTurn: c.g.turn };
        return true;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
