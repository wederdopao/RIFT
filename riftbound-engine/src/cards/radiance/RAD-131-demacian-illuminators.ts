import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-131',
  triggers: [
    {
      on: 'die',
      label: 'Buff em uma unidade aliada',
      cond: (c, ev) => {
        const mine = ((ev.dying || []) as any[]).filter((d) => d.unit && d.controller === c.p);
        return mine.length > 0 && mine[0].id === ev.obj?.id;
      },
      targets: [T.friendlyUnit('Demacian Illuminators: Buff em qual unidade aliada?')],
      resolve: function* (c) { const u = c.targets[0][0]; if (u) c.g.buff(u, c.p); },
    },
  ],
});
