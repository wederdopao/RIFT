import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-153 Agony's Embrace
registerCard({
  code: 'RAD-153',
  triggers: [
    {
      on: 'cardPlayed',
      label: 'Comprar 1 (e descartar 1 se não é seu turno)',
      cond: (c, ev) => {
        if (ev.player !== c.p || ev.via !== 'hidden') return false;
        const d = (c.self.data ||= {});
        if (d.agonyTurn === c.g.turn) return false;
        d.agonyTurn = c.g.turn;
        return true;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
        if (c.g.active !== c.p) yield* c.g.discard(c.p, 1);
      },
    },
  ],
});
