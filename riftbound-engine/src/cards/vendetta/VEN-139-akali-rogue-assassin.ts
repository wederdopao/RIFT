import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-139 Akali, Rogue Assassin
registerCard({
  code: 'VEN-139',
  empower: E(3, 'any'),
  activated: [
    {
      label: 'Mover uma unidade aliada num showdown para a base; se estou Empowered, prepará-la',
      timing: 'action',
      exhaustSelf: true,
      targets: [
        {
          prompt: 'Akali: qual unidade aliada num showdown?',
          filter: (c, o) => o.controller === c.p && !!c.g.showdown && c.g.showdown.bf === c.g.bfIndex(o),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u || c.g.active !== c.p) return;
        c.g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
        if (c.self.empowered) c.g.ready(u, c.p);
      },
    },
  ],
});
