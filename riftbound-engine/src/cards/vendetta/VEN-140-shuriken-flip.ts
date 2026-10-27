import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-140 Shuriken Flip
registerCard({
  code: 'VEN-140',
  flow: E(3, 'any'),
  spell: {
    label: 'Shuriken Flip',
    targets: [{ prompt: '2 de dano em qual unidade inimiga num campo? (até 1)', min: 0, max: 1, filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 }],
    resolve: function* (c) {
      const u = c.targets[0]?.[0];
      if (u) c.g.dealDamage(u, 2, c.self);
      yield* moveFriendlyUnit(c, 'Shuriken Flip: mover qual unidade sua?');
    },
  },
});
