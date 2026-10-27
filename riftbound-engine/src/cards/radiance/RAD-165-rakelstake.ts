import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-165 Rakelstake
registerCard({
  code: 'RAD-165',
  triggers: [
    {
      on: 'play',
      label: 'Predict',
      controller: (_g, _src, ev) => (ev.player === 0 || ev.player === 1 ? ev.player : null),
      cond: (c, ev) => {
        const l = ev.playLoc ?? ev.loc;
        if (ev.spell || !ev.obj || l?.t !== 'bf' || l.i !== c.g.bfOf(c.self)) return false;
        const d = (c.self.data ||= {});
        if (d.rakelTurn !== c.g.turn) d.rakel = [];
        d.rakelTurn = c.g.turn;
        if (d.rakel.includes(ev.player)) return false;
        d.rakel.push(ev.player);
        return true;
      },
      resolve: function* (c) {
        yield* c.g.predict(c.p, 1);
      },
    },
  ],
});
