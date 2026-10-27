import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-096',
  selfCostMod: (g, self, p) => {
    const nm = g.data(self).name;
    const n = g.pl[p].trash.filter((id) => g.data(g.objs[id]).name === nm).length;
    return -2 * n;
  },
});
