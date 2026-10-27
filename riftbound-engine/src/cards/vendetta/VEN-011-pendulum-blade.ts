import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Pendulum Blade
registerCard({
  code: 'VEN-011',
  equipCost: E(0, 'Fury'),
  equipped: {
    triggers: [
      {
        on: 'move',
        label: '+2 Might (movi para um campo)',
        cond: (c, ev) => ev.unit?.id === c.self.id && ev.to?.t === 'bf',
        resolve: function* (c) {
          c.g.giveMight(c.self, 2);
        },
      },
    ],
  },
});
