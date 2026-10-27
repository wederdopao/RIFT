import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-150 Acceleration Gate
registerCard({
  code: 'VEN-150',
  spell: {
    label: 'Acceleration Gate',
    resolve: function* (c) {
      const g = c.g;
      const cands = [
        ...g.board().filter((o) => o.controller === c.p && o.exhausted && (g.isUnit(o) || g.isGear(o))),
        ...g.runesOf(c.p).filter((r) => r.exhausted),
      ];
      if (!cands.length) return;
      const picks = yield* g.chooseObj(c.p, 'Acceleration Gate: preparar até 4 (unidades, gear e/ou runas)', cands, 0, 4);
      for (const o of picks) g.ready(o, c.p);
    },
  },
});
