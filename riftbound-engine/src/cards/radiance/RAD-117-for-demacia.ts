import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-117',
  keywords: { reaction: true },
  spell: {
    label: 'For Demacia!',
    targets: [{ prompt: 'For Demacia!: escolha um campo de batalha', kind: 'battlefield' }],
    resolve: function* (c) {
      const g = c.g;
      const b = c.targets[0][0];
      const i = b ? g.bfOf(b) : -1;
      if (i < 0) return;
      for (const u of g.unitsAtBf(i, c.p)) g.giveKw(u, { shield: 2 });
    },
  },
});
