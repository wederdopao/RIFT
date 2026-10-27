import { registerCard } from '../../engine/script';

// Quando você joga um spell, me dê +1 de Might neste turno.
// Dispara quando o spell termina de resolver (419.4.a; RiftJudge #9946); spell anulado não conta.
registerCard({
  code: 'OGN-103',
  triggers: [
    {
      on: 'play',
      label: '+1 de Might (você jogou um spell)',
      cond: (c, ev) => ev.player === c.p && !!ev.spell,
      resolve: function* (c) {
        c.g.giveMight(c.self, 1);
      },
    },
  ],
});
