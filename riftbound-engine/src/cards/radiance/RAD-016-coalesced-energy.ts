import { registerCard } from '../../engine/script';

// No fim do seu turno, recicle todas as suas runas e canalize 4 runas exauridas.
registerCard({
  code: 'RAD-016',
  triggers: [
    {
      on: 'turnEnd',
      label: 'Reciclar as runas e canalizar 4 exauridas',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        const g = c.g;
        yield* g.recycleCards(g.runesOf(c.p), { by: c.p });
        g.channel(c.p, 4, true);
      },
    },
  ],
});
