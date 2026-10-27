import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { P } from '../../engine/types';
// Quando você me joga, se você controla um Poro, me dê um Buff e compre 1.
// Revisão UNL order: tag ganha também conta (g.hasTag; Ivern, Friend to All: "I gain that tag").
const hasPoro = (g: Engine, p: P) => g.units().some((u) => u.controller === p && g.hasTag(u, 'Poro'));
registerCard({
  code: 'OGN-061',
  triggers: [
    {
      on: 'play',
      label: 'Com um Poro: Buff e comprar 1',
      cond: (c, ev) => ev.obj?.id === c.self.id && hasPoro(c.g, c.p),
      resolve: function* (c) {
        if (!hasPoro(c.g, c.p)) return;
        c.g.buff(c.self, c.p);
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
