import { registerCard } from '../../engine/script';

// Hidden. Quando você me joga, me dê +3 de Might neste turno.
registerCard({
  code: 'OGN-197',
  keywords: { hidden: true },
  onPlay: [
    {
      label: '+3 de Might neste turno',
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 3);
      },
    },
  ],
});
