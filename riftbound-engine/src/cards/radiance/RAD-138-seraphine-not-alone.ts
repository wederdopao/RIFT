import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-138',
  mightMod: (g, self) => g.units().filter((u) => u.id !== self.id && u.controller === self.controller && u.exhausted).length,
  triggers: [
    {
      on: 'play',
      label: 'Jogar uma ficha Recruit na base',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) { yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p }); },
    },
    {
      on: 'exhaust',
      label: 'Jogar uma ficha Recruit na base',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) { yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p }); },
    },
  ],
});
