import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

const tentacle = {
  label: 'Illaoi: jogar uma ficha Tentacle',
  resolve: function* (c: any) {
    const loc = yield* chooseTokenLoc(c, 'Illaoi: onde jogar a ficha Tentacle?');
    if (loc) yield* c.g.playTokenG('TOK-TENTACLE', c.p, loc);
  },
};
registerCard({
  code: 'VEN-109',
  mightMod: (g, self) => g.units().filter((u) => u.controller === self.controller && u.token).length,
  onPlay: [tentacle],
  triggers: [
    {
      ...tentacle,
      on: ['conquer', 'hold'],
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
    },
  ],
});
