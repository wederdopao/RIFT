import { registerCard } from '../../engine/script';

// Gear: quando uma unidade aliada ataca ou defende sozinha, dê +1 de Might a ela neste turno.
registerCard({
  code: 'OGN-060',
  triggers: [
    {
      on: ['attack', 'defend'],
      label: '+1 de Might para quem luta sozinho',
      cond: (c, ev) => !!ev.unit && ev.unit.controller === c.p && c.g.isAlone(ev.unit),
      resolve: function* (c) {
        const u = c.ev!.unit;
        if (u.zone === 'board') c.g.giveMight(u, 1);
      },
    },
  ],
});
