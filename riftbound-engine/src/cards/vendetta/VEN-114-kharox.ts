import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-114',
  empower: E(6, 'Chaos', 'Chaos'),
  triggers: [
    {
      on: 'empower',
      label: 'Kharox: oponente Burn 3; jogar unidade do descarte dele',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const opp = (1 - c.p) as P;
        g.burn(opp, 3);
        const us = g.pl[opp].trash.map((id) => g.objs[id]).filter((o) => g.isUnit(o));
        if (!us.length || !(yield* g.yesNo(c.p, 'Kharox: jogar uma unidade do descarte do oponente?'))) return;
        const [pick] = yield* g.chooseObj(c.p, 'Kharox: jogar qual unidade?', us);
        if (pick) yield* g.playFromEffect(c.p, pick, NO_COST);
      },
    },
  ],
});
