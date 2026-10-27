import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Hextech Formula
registerCard({
  code: 'VEN-062',
  entersReady: () => false,
  activated: [
    {
      label: 'Tap: Empower outro gear',
      exhaustSelf: true,
      targets: [{ prompt: 'Hextech Formula: empower qual outro gear?', kind: 'gear', filter: (c, o) => o.id !== c.self.id }],
      resolve: function* (c) {
        const o = c.targets[0][0];
        if (o) c.g.empowerObj(o, c.p);
      },
    },
  ],
});
