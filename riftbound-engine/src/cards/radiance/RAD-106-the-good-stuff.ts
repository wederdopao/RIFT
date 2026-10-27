import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-106',
  keywords: { deploy: true },
  triggers: [
    {
      on: 'play',
      label: 'Descartar 1, depois comprar 3',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.discard(c.p, 1, 'The Good Stuff: descarte 1');
        yield* c.g.draw(c.p, 3);
      },
    },
    {
      on: 'hold',
      label: 'Devolver para a mão',
      cond: (c, ev) => ev.player === c.p && ev.bf === c.g.bfIndex(c.self),
      resolve: function* (c) { if (c.self.zone === 'board') c.g.returnToHand(c.self); },
    },
  ],
});
