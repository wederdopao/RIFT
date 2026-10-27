import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-104',
  activated: [
    {
      label: 'Stun em uma unidade inimiga',
      exhaustSelf: true,
      targets: [T.enemyUnit('Pitiless Stalker: Stun em qual unidade inimiga?')],
      resolve: function* (c) { const u = c.targets[0][0]; if (u) c.g.stun(u, c.p); },
    },
  ],
});
