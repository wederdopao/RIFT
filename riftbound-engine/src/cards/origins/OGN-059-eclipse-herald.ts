import { registerCard } from '../../engine/script';

// Quando você atordoa uma unidade inimiga, me prepare e me dê +1 de Might neste turno.
registerCard({
  code: 'OGN-059',
  triggers: [
    {
      on: 'stun',
      label: 'Preparar e +1 de Might',
      cond: (c, ev) => ev.player === c.p && !!ev.unit && ev.unit.controller !== c.p,
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        c.g.ready(c.self);
        c.g.giveMight(c.self, 1);
      },
    },
  ],
});
