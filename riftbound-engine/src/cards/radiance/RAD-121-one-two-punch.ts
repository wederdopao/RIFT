import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-121',
  keywords: { action: true },
  spell: {
    label: 'One-Two Punch',
    targets: [T.friendlyUnit('One-Two Punch: Buff em qual unidade aliada?'), T.enemyUnit('One-Two Punch: Stun em qual unidade inimiga?')],
    resolve: function* (c) {
      const a = c.targets[0][0];
      const b = c.targets[1]?.[0];
      if (a && a.zone === 'board') c.g.buff(a, c.p);
      if (b && b.zone === 'board') c.g.stun(b, c.p);
    },
  },
});
