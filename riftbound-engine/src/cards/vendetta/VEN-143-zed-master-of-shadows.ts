import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-143 Zed, Master of Shadows
registerCard({
  code: 'VEN-143',
  triggers: [
    {
      on: 'banish',
      label: 'Empower em mim',
      cond: (c, ev) => ev.player === c.p && !c.self.empowered,
      resolve: function* (c) {
        c.g.empowerObj(c.self, c.p);
      },
    },
  ],
  activated: [
    {
      label: 'Disempower em mim, exaurir: descartar 1 e comprar 1',
      timing: 'action',
      exhaustSelf: true,
      condition: (_g, self) => self.empowered,
      extraCost: disempowerMe,
      resolve: function* (c) {
        yield* c.g.discard(c.p, 1);
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
