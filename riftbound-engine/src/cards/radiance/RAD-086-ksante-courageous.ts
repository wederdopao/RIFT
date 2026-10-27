import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-086',
  keywords: { accelerate: true, shield: 2 },
  triggers: [
    {
      on: 'hold',
      label: 'Canalizar 1 runa',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) { c.g.channel(c.p, 1); },
    },
  ],
});
