import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você segura aqui, dê Buff a uma unidade aqui.
registerCard({
  code: 'OGN-283',
  triggers: [
    {
      on: 'hold',
      label: 'Buff numa unidade aqui',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      targets: [{ prompt: 'Navori Fighting Pit: Buff em qual unidade aqui?', filter: (c, o) => c.g.bfIndex(o) === bfIdx(c) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.buff(u, c.p);
      },
    },
  ],
});
