import { registerCard } from '../../engine/script';

// Action: dê +5 de Might às unidades aliadas neste turno.
registerCard({
  code: 'OGN-233',
  keywords: { action: true },
  spell: {
    label: 'Grand Strategem',
    resolve: function* (c) {
      for (const u of c.g.units().filter((x) => x.controller === c.p)) c.g.giveMight(u, 5);
    },
  },
});
