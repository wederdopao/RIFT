import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Mournful Witness
registerCard({
  code: 'VEN-028',
  mightMod: (g, self) => (self.empowered ? 2 : 0),
  triggers: [
    {
      on: 'combatEnd',
      label: 'Empower em mim',
      cond: (c, ev) => (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        c.g.empowerObj(c.self, c.p);
      },
    },
  ],
});
