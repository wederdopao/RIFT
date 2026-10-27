import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-151 Mel, Soul's Reflection
registerCard({
  code: 'VEN-151',
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
      label: 'Disempower em mim, exaurir: -2 de Might a uma unidade num campo',
      exhaustSelf: true,
      condition: (_g, self) => self.empowered,
      extraCost: disempowerMe,
      targets: [{ prompt: 'Mel: -2 de Might em qual unidade num campo?', filter: (c, o) => c.g.bfIndex(o) >= 0 }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, -2, 'turn');
      },
    },
  ],
});
