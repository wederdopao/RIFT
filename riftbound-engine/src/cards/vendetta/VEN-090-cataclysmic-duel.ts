import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-090',
  spell: {
    label: 'Cataclysmic Duel',
    resolve: function* (c) {
      const g = c.g;
      const doomed: Obj[] = [];
      for (const q of [c.p, (1 - c.p) as P]) {
        const us = g.units().filter((u) => u.controller === q);
        if (us.length <= 1) continue;
        const [keep] = yield* g.chooseObj(q, 'Cataclysmic Duel: qual unidade sua sobrevive?', us);
        for (const u of us) if (u !== keep) doomed.push(u);
      }
      if (doomed.length) yield* g.killG(doomed);
    },
  },
});
