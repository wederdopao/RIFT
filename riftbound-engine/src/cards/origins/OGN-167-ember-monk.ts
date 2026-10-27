import { registerCard } from '../../engine/script';

// Quando você joga uma carta escondida (Hidden), me dê +2 de Might neste turno.
// Spell jogado escondido: o gatilho dispara quando ele termina de resolver (regra 419.4.a); anulado não conta.
registerCard({
  code: 'OGN-167',
  triggers: [
    {
      on: 'play',
      label: '+2 de Might neste turno',
      cond: (c, ev) => ev.player === c.p && ev.via === 'hidden' && ev.obj?.id !== c.self.id,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 2);
      },
    },
  ],
});
