import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Akali, Silent
registerCard({
  code: 'VEN-038',
  auras: [{ cantBeChosen: (g, src, target) => target.id === src.id && !g.inCombat(src) }],
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
});
