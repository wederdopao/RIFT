import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Brittle Steel
registerCard({
  code: 'VEN-003',
  flow: E(4, 'Fury'),
  spell: {
    label: 'Brittle Steel',
    targets: [{ prompt: 'Brittle Steel: matar qual gear?', kind: 'gear' }],
    resolve: function* (c) {
      const o = c.targets[0][0];
      if (o) yield* c.g.killG(o);
    },
  },
});
