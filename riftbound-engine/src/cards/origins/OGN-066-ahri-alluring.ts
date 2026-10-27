import { registerCard } from '../../engine/script';

// Quando eu seguro (hold), você ganha 1 ponto.
registerCard({
  code: 'OGN-066',
  triggers: [
    {
      on: 'hold',
      label: 'Ganhar 1 ponto',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, c.g.name(c.self));
      },
    },
  ],
});
