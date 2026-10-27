import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-119',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: ficha Bird na base',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) { yield* c.g.playTokenG('TOK-BIRD', c.p, { t: 'base', p: c.p }); },
    },
  ],
});
