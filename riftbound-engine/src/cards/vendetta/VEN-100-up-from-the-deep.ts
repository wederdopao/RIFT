import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-100',
  flow: E(3),
  spell: {
    label: 'Up from the Deep',
    resolve: function* (c) {
      for (let k = 0; k < 2; k++) {
        const loc = yield* chooseTokenLoc(c, 'Up from the Deep: onde jogar a ficha Tentacle?');
        if (loc) yield* c.g.playTokenG('TOK-TENTACLE', c.p, loc);
      }
    },
  },
});
