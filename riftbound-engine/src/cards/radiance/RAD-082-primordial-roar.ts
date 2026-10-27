import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-082',
  asPlayed: showOff((g, o) => g.isUnit(o), 'Show Off uma unidade'),
  spell: {
    label: 'Primordial Roar',
    targets: [{ prompt: 'Primordial Roar: dano em qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      const info = showedOff(c);
      if (u && u.zone === 'board' && info) c.g.dealDamage(u, Math.max(0, info.might), c.self);
    },
  },
});
