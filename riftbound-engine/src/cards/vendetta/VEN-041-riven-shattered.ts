import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Riven, Shattered
registerCard({
  code: 'VEN-041',
  keywords: { weaponmaster: true },
  triggers: [
    {
      on: 'attack',
      label: '2 de dano por Equipment anexado',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Riven: dano em qual unidade inimiga aqui?',
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self),
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        const n = c.g.equipmentOf(c.self).length;
        if (u && n > 0) c.g.dealDamage(u, 2 * n, c.self);
      },
    },
  ],
});
