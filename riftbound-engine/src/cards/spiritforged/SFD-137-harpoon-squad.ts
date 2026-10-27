import { registerCard } from '../../engine/script';

// Quando eu me movo de um campo de batalha, me dê +2 de Might neste turno.
registerCard({
  code: 'SFD-137',
  triggers: [
    {
      on: 'move',
      label: '+2 de Might neste turno',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.from?.t === 'bf',
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 2);
      },
    },
  ],
});
