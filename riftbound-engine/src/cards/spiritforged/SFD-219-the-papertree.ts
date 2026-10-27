import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
import type { P } from '../../engine/types';
// Campo: quando você segura aqui, cada jogador canaliza 1 runa exaurida (começando por você, na ordem de turno).
registerCard({
  code: 'SFD-219',
  triggers: [
    {
      on: 'hold',
      label: 'Cada jogador canaliza 1 runa exaurida',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        for (const p of [c.p, 1 - c.p] as P[]) c.g.channel(p, 1, true);
      },
    },
  ],
});
