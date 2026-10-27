import { registerCard } from '../../engine/script';

// Shield 3. Quando você me joga num campo, pode mover outra unidade sua daqui para a base.
registerCard({
  code: 'RAD-031',
  keywords: { shield: 3 },
  triggers: [
    {
      on: 'play',
      label: 'Mover outra unidade sua daqui para a base',
      optional: 'Mover outra unidade sua daqui para a base?',
      cond: (c, ev) => ev.obj?.id === c.self.id && ev.loc?.t === 'bf',
      targets: [
        {
          prompt: 'Stoic Ferryman: mover qual unidade sua daqui para a base?',
          filter: (c, o) => o.controller === c.p && o.id !== c.self.id && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u && u.zone === 'board') c.g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
      },
    },
  ],
});
