import { registerCard } from '../../engine/script';

// Quando você me joga, dê +8 de Might a uma unidade neste turno.
registerCard({
  code: 'OGN-082',
  onPlay: [
    {
      label: '+8 de Might numa unidade',
      targets: [{ prompt: 'Whiteflame Protector: +8 em qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 8);
      },
    },
  ],
});
