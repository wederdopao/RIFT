import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';

// Action: o custo de energia cai pela maior Might entre as suas unidades. Cause 5 a uma unidade num campo.
registerCard({
  code: 'OGN-014',
  keywords: { action: true },
  selfCostMod: (g, _self, p) => -Math.max(0, ...g.units().filter((u) => u.controller === p).map((u) => g.might(u))),
  spell: {
    label: 'Sky Splitter',
    targets: [{ prompt: 'Sky Splitter: 5 de dano em qual unidade num campo?', filter: (c, o) => atBf(c, o) }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, 5, c.self);
    },
  },
});
