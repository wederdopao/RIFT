import { registerCard } from '../../engine/script';

// Quando você me dá um Buff, prepare-me.
registerCard({
  code: 'SFD-047',
  triggers: [
    {
      on: 'buff',
      label: 'Preparar-me',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.player === c.p,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.ready(c.self, c.p);
      },
    },
  ],
});
