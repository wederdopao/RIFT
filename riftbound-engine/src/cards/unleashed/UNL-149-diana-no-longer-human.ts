import { registerCard } from '../../engine/script';

// Campeã 3, Ambush. Quando você joga um spell, eu ganho +2 de Might neste turno.
// - "Quando você joga" dispara quando o spell termina de resolver (419.4.a; FAQ oficial do Unleashed, seção Legion: o
//   "play" das condições de gatilho é a resolução); spell anulado não foi jogado (RiftJudge #10782).
registerCard({
  code: 'UNL-149',
  keywords: { ambush: true },
  triggers: [
    {
      on: 'play',
      label: '+2 de Might neste turno',
      cond: (c, ev) => !!ev.spell && ev.player === c.p,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 2);
      },
    },
  ],
});
