import { registerCard } from '../../engine/script';
// Action. Dê +2 de Might às unidades aliadas neste turno.
registerCard({
  code: 'OGS-024',
  keywords: { action: true },
  spell: {
    label: 'Decisive Strike',
    resolve: function* (c) {
      for (const u of c.g.units().filter((x) => x.controller === c.p)) c.g.giveMight(u, 2);
    },
  },
});
