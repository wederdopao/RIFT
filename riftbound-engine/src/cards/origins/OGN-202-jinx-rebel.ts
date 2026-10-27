import { registerCard } from '../../engine/script';

// Quando você descarta uma ou mais cartas, me prepare e me dê +1 de Might neste turno.
registerCard({
  code: 'OGN-202',
  triggers: [
    {
      on: 'discard',
      label: 'Preparar e +1 de Might neste turno',
      cond: (c, ev) => ev.player === c.p && ev.first !== false,
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        c.g.ready(c.self);
        c.g.giveMight(c.self, 1);
      },
    },
  ],
});
