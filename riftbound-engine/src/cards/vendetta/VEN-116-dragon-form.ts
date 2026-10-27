import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-116',
  flow: E(3),
  spell: {
    label: 'Dragon Form',
    targets: [T.anyUnit('Dragon Form: o Might base de qual unidade vira 5?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      c.g.addEffect({ target: u.id, baseMight: 5, until: 'turn' });
      c.g.say(`${c.g.name(u)} tem Might base 5 neste turno.`);
    },
  },
});
