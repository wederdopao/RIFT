import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-101',
  keywords: { action: true },
  spell: {
    label: "An Offer You Can't Refuse",
    targets: [{ prompt: 'Matar qual gear?', kind: 'gear' }],
    resolve: function* (c) {
      const g = c.g;
      const o = c.targets[0][0];
      if (!o || o.zone !== 'board') return;
      const who = o.controller;
      yield* g.killG(o);
      g.createToken('TOK-GOLD', who, { t: 'base', p: who }, false);
    },
  },
});
