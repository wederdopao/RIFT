import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-091',
  entersReady: (g, self) => g.cfg.victoryScore - g.pl[self.controller].points > 3,
  triggers: [
    {
      on: 'attack',
      label: 'Corrupted Dragon: mover unidades inimigas aqui (Might <= 5) para a base',
      optional: 'Corrupted Dragon: mover unidades inimigas com 5 Might ou menos para a base delas?',
      cond: (c, ev) => ev.unit?.id === c.self.id && !ev.playerLevel,
      resolve: function* (c) {
        const g = c.g;
        const i = g.bfIndex(c.self);
        if (i < 0) return;
        const es = g.unitsAtBf(i).filter((u) => u.controller !== c.p && g.might(u) <= 5);
        if (!es.length) return;
        const picks = yield* g.chooseObj(c.p, 'Corrupted Dragon: mover quais unidades inimigas (Might <= 5) para a base delas?', es, 0, es.length);
        for (const u of picks) if (u.zone === 'board') g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
      },
    },
  ],
});
