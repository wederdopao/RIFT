import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-102',
  triggers: [
    {
      on: 'play',
      label: 'Ravenbloom Prefect: banir-me para banir o gear',
      optional: 'Ravenbloom Prefect: banir a si mesmo para banir o gear?',
      cond: (c, ev) => !!ev.obj && ev.player !== c.p && ev.obj.id !== c.self.id && c.g.isGear(ev.obj),
      canPayExtra: (c) => c.self.zone === 'board',
      extraCost: function* (c) {
        if (c.self.zone !== 'board') return false;
        c.g.banishObj(c.self); // "banish me" é o custo
        return true;
      },
      resolve: function* (c) {
        const gear = c.ev?.obj;
        if (gear && gear.zone === 'board') c.g.banishObj(gear);
      },
    },
  ],
});
