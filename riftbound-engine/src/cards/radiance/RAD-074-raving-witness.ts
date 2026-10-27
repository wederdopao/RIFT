import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-074',
  triggers: [
    {
      on: 'move',
      label: 'Revelar o topo: Mighty vai para a mão, senão recicla',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const [o] = yield* g.revealTop(c.p, 1, c.p);
        if (!o || o.zone !== 'mainDeck') return;
        if (g.isUnit(o) && g.data(o).might >= 5) yield* g.draw(c.p, 1);
        else g.recycleCard(o, { by: c.p });
      },
    },
  ],
});
