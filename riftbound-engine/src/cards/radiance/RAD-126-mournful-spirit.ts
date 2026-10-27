import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-126',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: matar uma unidade ou gear aqui',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.loc,
      resolve: function* (c) {
        const g = c.g;
        const loc = c.ev?.loc;
        const cands = g.board().filter((o) => (g.isUnit(o) || g.isGear(o)) && o.id !== c.self.id && g.locEq(g.locOf(o), loc));
        if (!cands.length) return;
        const [o] = yield* g.chooseObj(c.p, 'Mournful Spirit: matar qual unidade ou gear aqui? (opcional)', cands, 0, 1);
        if (o && o.zone === 'board') yield* g.killG(o);
      },
    },
  ],
});
