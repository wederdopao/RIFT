import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Perfect Execution
registerCard({
  code: 'VEN-012',
  flow: E(3, 'Fury'),
  spell: {
    label: 'Perfect Execution',
    targets: [T.anyUnit('Perfect Execution: preparar qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      c.g.ready(u, c.p);
      c.g.giveKw(u, { assault: 3 });
    },
  },
});
