import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Astral Heron
// "When you play your first card each turn, if I'm at a battlefield, your next card costs [2][Rune][Rune] less."
registerCard({
  code: 'VEN-044',
  triggers: [
    {
      on: 'cardPlayed',
      label: 'A próxima carta custa [2][Rune][Rune] a menos',
      cond: (c, ev) => ev.player === c.p && ev.nth === 1 && c.g.bfIndex(c.self) >= 0,
      resolve: function* (c) {
        c.g.addEffect({ player: c.p, nextPlay: 'card', costMod: -2, powerLess: 2, until: 'turn' });
      },
    },
  ],
});
