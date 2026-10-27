import { registerCard } from '../../engine/script';

// Ganking. Na terceira vez que eu me movo num turno, você ganha 1 ponto.
registerCard({
  code: 'OGN-205',
  keywords: { ganking: true },
  triggers: [
    {
      on: 'move',
      label: 'Terceiro movimento no turno: 1 ponto',
      cond: (c, ev) => ev.unit?.id === c.self.id && c.g.movesThisTurn(c.self) === 3,
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, 'Yasuo se moveu pela terceira vez no turno');
      },
    },
  ],
});
