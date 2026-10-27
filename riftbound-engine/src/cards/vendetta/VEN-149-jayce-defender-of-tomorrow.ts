import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-149 Jayce, Defender of Tomorrow
registerCard({
  code: 'VEN-149',
  empower: E(2, 'any', 'any'),
  activated: [
    {
      label: '[1], exaurir: preparar um gear (2 se Empowered)',
      exhaustSelf: true,
      cost: E(1),
      resolve: function* (c) {
        const gs = c.g.gearOf(c.p).filter((x) => x.exhausted);
        if (!gs.length) return;
        const n = c.self.empowered ? 2 : 1;
        const picks = yield* c.g.chooseObj(c.p, `Jayce: preparar ${n === 2 ? 'até 2 gear' : 'qual gear'}?`, gs, 1, n);
        for (const x of picks) c.g.ready(x, c.p);
      },
    },
  ],
});
