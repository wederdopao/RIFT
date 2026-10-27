import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-124',
  mightMod: (g, self) => (self.empowered ? 2 : 0),
  empower: {
    extra: {
      label: 'Kill a friendly unit',
      // "a friendly unit" inclui a própria Grayback (sem "another"; como Malzahar, Fanatic)
      canPay: (c) => c.g.units().some((u) => u.controller === c.p),
      pay: function* (c) {
        const us = c.g.units().filter((u) => u.controller === c.p);
        if (!us.length) return false;
        const [k] = yield* c.g.chooseObj(c.p, 'Escaped Grayback: matar qual unidade aliada?', us);
        if (!k) return false;
        yield* c.g.killG(k);
        return true;
      },
    },
  },
});
