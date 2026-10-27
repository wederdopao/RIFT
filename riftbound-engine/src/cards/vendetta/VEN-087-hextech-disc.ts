import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-087',
  empower: { exhaustSelf: true },
  activated: [
    {
      label: 'Desempower, [1], exaurir: jogar ficha Mech 3 Might',
      cost: E(1),
      exhaustSelf: true,
      condition: (g, self) => self.empowered,
      canPayExtra: (c) => c.self.empowered,
      extraCost: function* (c) {
        c.g.disempower(c.self);
        return true;
      },
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-MECH', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
