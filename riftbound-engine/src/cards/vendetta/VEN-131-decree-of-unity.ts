import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-131',
  spell: {
    label: 'Decree of Unity',
    targets: [
      {
        prompt: 'Decree of Unity: matar qual unidade ou gear Chaos inimigo?',
        kind: 'permanent',
        filter: (c, o) => o.controller !== c.p && hasDomain(c.g, o, 'Chaos'),
      },
    ],
    resolve: function* (c) {
      const t = c.targets[0][0];
      if (t) yield* c.g.killG(t);
    },
  },
});
