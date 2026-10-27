import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-109',
  keywords: { disarm: 1 },
  triggers: [
    {
      on: 'hold',
      label: 'Pontuar 1 se controla uma carta virada aqui',
      cond: (c, ev) => {
        if (ev.player !== c.p || !(ev.units || []).includes(c.self.id)) return false;
        const i = c.g.bfIndex(c.self);
        return i >= 0 && c.g.bfs[i].facedown.some((id) => c.g.objs[id].controller === c.p);
      },
      resolve: function* (c) { c.g.gainPoints(c.p, 1, 'Evelynn, In Control'); },
    },
  ],
});
