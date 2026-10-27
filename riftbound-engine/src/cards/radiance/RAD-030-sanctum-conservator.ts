import { registerCard } from '../../engine/script';

// Quando você joga uma carta com custo de Energia 7+, me prepare.
registerCard({
  code: 'RAD-030',
  triggers: [
    {
      on: 'cardPlayed',
      label: 'Carta de custo 7+: me preparar',
      cond: (c, ev) => ev.player === c.p && c.g.data(ev.obj).energy >= 7,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.ready(c.self, c.p);
      },
    },
  ],
});
