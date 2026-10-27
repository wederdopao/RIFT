import { registerCard } from '../../engine/script';
// Quando você joga um spell que custa [5] ou mais, me dê +3 de Might neste turno.
// Dispara quando o spell termina de resolver (419.4.a). O custo verificado é o impresso, mesmo com descontos (regra 206).
registerCard({
  code: 'OGS-006',
  triggers: [
    {
      on: 'play',
      label: '+3 de Might (spell de 5+)',
      cond: (c, ev) => !!ev.spell && ev.player === c.p && c.g.data(ev.obj).energy >= 5,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 3);
      },
    },
  ],
});
