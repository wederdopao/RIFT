import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-111',
  triggers: [
    {
      on: 'beginStart',
      label: 'Revelar o topo de cada deck; o menor custo compra',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        const g = c.g;
        const opp = (1 - c.p) as any;
        const [mine] = yield* g.revealTop(c.p, 1, c.p);
        const [theirs] = yield* g.revealTop(opp, 1, c.p);
        const lowest = mine && (!theirs || g.data(mine).energy <= g.data(theirs).energy);
        if (lowest && mine.zone === 'mainDeck' && g.pl[c.p].mainDeck[0] === mine.id) yield* g.draw(c.p, 1);
        const rest = [mine, theirs].filter((o) => o && o.zone === 'mainDeck');
        if (rest.length) yield* g.recycleCards(rest, { by: c.p });
      },
    },
  ],
});
