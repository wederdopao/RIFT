import { registerCard } from '../../engine/script';

// Quando você joga um gear, me prepare. (Fichas de gear também são "jogadas": regra 185.2.a.)
registerCard({
  code: 'OGN-091',
  triggers: [
    {
      on: 'play',
      label: 'Preparar (você jogou um gear)',
      cond: (c, ev) => ev.player === c.p && !!ev.obj && c.g.isGear(ev.obj),
      resolve: function* (c) {
        c.g.ready(c.self, c.p);
      },
    },
  ],
});
