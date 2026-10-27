import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-089',
  triggers: [
    {
      on: 'play',
      label: 'Exaurir para comprar 1',
      optional: 'Titanic Shrine: exaurir para comprar 1?',
      canPayExtra: (c) => !c.self.exhausted,
      extraCost: function* (c) {
        if (c.self.zone !== 'board' || c.self.exhausted) return false;
        c.g.exhaust(c.self);
        return true;
      },
      cond: (c, ev) => {
        const g = c.g;
        const o = ev.obj as Obj;
        if (ev.player !== c.p || !o || !g.isUnit(o) || c.self.exhausted || o.zone !== 'board') return false;
        const m = g.might(o);
        return g.units().every((x) => x.id === o.id || g.might(x) < m);
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
