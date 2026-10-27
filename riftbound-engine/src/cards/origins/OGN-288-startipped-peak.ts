import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você segura aqui, você pode canalizar 1 runa exaurida.
registerCard({
  code: 'OGN-288',
  triggers: [
    {
      on: 'hold',
      label: 'Canalizar 1 runa exaurida',
      optional: 'Canalizar 1 runa exaurida?',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        c.g.channel(c.p, 1, true);
      },
    },
  ],
});
