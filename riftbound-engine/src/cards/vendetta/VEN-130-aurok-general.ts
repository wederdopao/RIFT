import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-130',
  empower: E(3, 'Order'),
  auras: [
    {
      might: (g, src, t) => (src.empowered && src.zone === 'board' && t.zone === 'board' && t.empowered && g.isUnit(t) && t.controller === src.controller ? 2 : 0),
    },
  ],
});
