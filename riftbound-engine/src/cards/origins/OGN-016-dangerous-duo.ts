import { registerCard } from '../../engine/script';

// Legion – quando você me joga, dê +2 de Might a uma unidade neste turno.
registerCard({
  code: 'OGN-016',
  onPlay: [
    {
      label: 'Legion: +2 de Might a uma unidade',
      prepare: function* (c) {
        return c.g.legion(c.self, c.p);
      },
      targets: [{ prompt: 'Dangerous Duo: +2 de Might em qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 2);
      },
    },
  ],
});
