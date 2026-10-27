import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-094',
  triggers: [
    {
      on: 'hold',
      label: 'Jogar três Bombs num único campo',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        const g = c.g;
        if (!g.bfs.length) return;
        const [id] = yield* g.ask(c.p, 'choose', 'Explosimian: jogar as três Bombs em qual campo?', g.bfs.map((b, i) => ({ id: String(i), label: g.locName({ t: 'bf', i }), obj: b.objId })));
        for (let k = 0; k < 3; k++) g.createToken('TOK-BOMB', c.p, { t: 'bf', i: Number(id) });
      },
    },
  ],
});
