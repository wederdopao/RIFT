import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-098',
  auras: [
    {
      costModMin: (g, src, card, p) =>
        src.zone === 'board' && src.controller === p && card.zone === 'trash' && g.kind(card) === 'spell' && !!g.script(card).flow
          ? { amount: 2, min: 1 }
          : undefined,
    },
  ],
});
