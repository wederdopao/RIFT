import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-083',
  optionalCosts: [{ label: 'Pagar [Body] a mais (+2 Might na unidade aliada)?', cost: E(0, 'Body'), flag: 'paid' }],
  spell: {
    label: 'Rampage',
    targets: [T.friendlyUnit('Rampage: unidade aliada'), T.enemyUnit('Rampage: unidade inimiga')],
    resolve: function* (c) {
      const f = c.targets[0][0];
      const e = c.targets[1][0];
      // alvo ilegal: só as instruções dele são ignoradas; o +2 na aliada vale mesmo sem a inimiga (359.3.e.5-6)
      if (f && c.data.paid) c.g.giveMight(f, 2);
      if (!f || !e) return;
      const mf = c.g.might(f);
      const me = c.g.might(e);
      c.g.dealDamage(e, mf, f, { byUnit: true });
      c.g.dealDamage(f, me, e, { byUnit: true });
    },
  },
});
