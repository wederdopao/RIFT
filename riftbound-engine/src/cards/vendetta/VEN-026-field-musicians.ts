import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Field Musicians
registerCard({
  code: 'VEN-026',
  onPlay: [
    {
      label: '+3 Might a uma unidade',
      targets: [T.anyUnit('Field Musicians: +3 Might em qual unidade?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 3);
      },
    },
  ],
});
