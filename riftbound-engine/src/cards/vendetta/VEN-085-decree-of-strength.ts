import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-085',
  spell: {
    label: 'Decree of Strength',
    resolve: function* (c) {
      const g = c.g;
      const opp = (1 - c.p) as P;
      const hand = g.pl[opp].hand.map((id) => g.objs[id]);
      g.say(`${g.pname(opp)} revela a mão: ${hand.map((o) => g.name(o)).join(', ') || 'vazia'}.`, opp);
      const cands = hand.filter((o) => hasDomain(g, o, 'Mind'));
      if (!cands.length) return;
      const [pick] = yield* g.chooseObj(c.p, 'Decree of Strength: qual carta Mind reciclar?', cands);
      if (pick) g.recycleCard(pick, { by: c.p });
    },
  },
});
