import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-153 Ambessa, Matriarch of War
registerCard({
  code: 'VEN-153',
  triggers: [
    {
      on: 'empower',
      label: 'Empower em mim',
      cond: (c, ev) => ev.player === c.p && !!ev.obj && ev.obj.id !== c.self.id && !c.self.empowered,
      resolve: function* (c) {
        c.g.empowerObj(c.self, c.p);
      },
    },
  ],
  activated: [
    {
      label: 'Disempower em mim, [Rune], exaurir: preparar uma unidade',
      exhaustSelf: true,
      cost: E(0, 'any'),
      condition: (_g, self) => self.empowered,
      extraCost: disempowerMe,
      targets: [{ prompt: 'Ambessa: preparar qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.ready(u, c.p);
      },
    },
  ],
});
