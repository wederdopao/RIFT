import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-090',
  keywords: { ambush: true },
  triggers: [
    {
      on: 'cardPlayed',
      label: 'Preparar-me e +1 de Might neste turno',
      cond: (c, ev) => ev.player === c.p && ev.via === 'hidden',
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        c.g.ready(c.self, c.p);
        c.g.giveMight(c.self, 1);
      },
    },
  ],
});
