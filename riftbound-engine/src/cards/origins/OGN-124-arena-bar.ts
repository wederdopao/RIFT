import { registerCard } from '../../engine/script';

// Gear: [Tap]: dê Buff a uma unidade aliada exaurida.
registerCard({
  code: 'OGN-124',
  activated: [
    {
      label: 'Exaurir: Buff numa unidade aliada exaurida',
      exhaustSelf: true,
      targets: [
        { prompt: 'Arena Bar: Buff em qual unidade sua exaurida?', filter: (c, o) => o.controller === c.p && o.exhausted },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.buff(u, c.p);
      },
    },
  ],
});
