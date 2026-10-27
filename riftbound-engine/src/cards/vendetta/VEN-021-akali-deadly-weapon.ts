import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Akali, Deadly Weapon
registerCard({
  code: 'VEN-021',
  empower: E(2, 'Fury'),
  mightMod: (g, self) => (self.empowered ? 1 : 0),
  triggers: [
    {
      on: 'move',
      label: 'Dano numa unidade do campo de origem/destino',
      optional: 'Causar dano a uma unidade em um campo de onde ou para onde me movi?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [
        {
          prompt: 'Akali: dano em qual unidade?',
          filter: (c, o) => {
            const i = c.g.bfIndex(o);
            const ev = c.ev;
            return i >= 0 && !!ev && [ev.from, ev.to].some((l) => l?.t === 'bf' && l.i === i);
          },
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, c.self.empowered ? 2 : 1, c.self);
      },
    },
  ],
});
