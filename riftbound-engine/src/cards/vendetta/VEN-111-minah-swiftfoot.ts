import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-111',
  triggers: [
    {
      on: 'move',
      label: 'Minah Swiftfoot: cada jogador descarta 1 ou compra 1',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.to?.t === 'bf',
      prepare: function* (c) {
        const [m] = yield* c.g.ask(c.p, 'choose', 'Minah Swiftfoot: escolha um', [
          { id: 'discard', label: 'Cada jogador descarta 1' },
          { id: 'draw', label: 'Cada jogador compra 1' },
        ]);
        c.data.mode = m;
        return true;
      },
      resolve: function* (c) {
        for (const q of [c.p, (1 - c.p) as P]) {
          if (c.data.mode === 'discard') yield* c.g.discard(q, 1, 'Minah Swiftfoot: descarte 1');
          else yield* c.g.draw(q, 1);
        }
      },
    },
  ],
});
