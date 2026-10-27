import { registerCard } from '../../engine/script';
import { DOMAINS } from '../../engine/types';

// Deploy. Oponentes precisam pagar [1][Rune] para mover unidades para este campo. Deathknell: compre 1.
registerCard({
  code: 'RAD-062',
  keywords: { deploy: true },
  auras: [
    {
      moveCost: (g, src, units, to, mover) =>
        src.zone === 'board' && to.t === 'bf' && to.i === g.bfIndex(src) && mover !== src.controller ? { energy: 1, power: [[...DOMAINS]] } : undefined,
    },
  ],
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: comprar 1',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
