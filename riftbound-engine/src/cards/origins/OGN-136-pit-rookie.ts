import { registerCard } from '../../engine/script';

// Quando você me joga, dê Buff a outra unidade aliada.
registerCard({
  code: 'OGN-136',
  onPlay: [
    {
      label: 'Buff em outra unidade aliada',
      targets: [{ prompt: 'Pit Rookie: Buff em qual outra unidade sua?', filter: (c, o) => o.controller === c.p && o.id !== c.self.id }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.buff(u, c.p);
      },
    },
  ],
});
