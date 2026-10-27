import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-138',
  keywords: { shield: 1 },
  triggers: [
    {
      on: 'hold',
      label: 'Shen: ganhar 1 ponto',
      cond: (c, ev) => {
        if (ev.player !== c.p || !(ev.units || []).includes(c.self.id)) return false;
        const i = c.g.bfIndex(c.self);
        return i >= 0 && c.g.unitsAtBf(i, c.p).filter((u) => u.id !== c.self.id).length === 1;
      },
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, 'Shen, Leader of the Kinkou Order');
      },
    },
  ],
});
