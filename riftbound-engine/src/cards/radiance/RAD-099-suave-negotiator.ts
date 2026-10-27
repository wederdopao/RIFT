import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-099',
  triggers: [
    {
      on: 'play',
      label: 'Você e o oponente compram 1',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
        yield* c.g.draw((1 - c.p) as any, 1);
      },
    },
  ],
});
