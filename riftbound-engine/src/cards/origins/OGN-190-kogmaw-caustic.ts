import { registerCard } from '../../engine/script';
import type { Loc } from '../../engine/types';

// Deathknell: cause 4 de dano a todas as unidades no meu campo de batalha.
registerCard({
  code: 'OGN-190',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: 4 de dano a todas as unidades no meu campo',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        const l: Loc | undefined = c.ev!.loc;
        if (!l || l.t !== 'bf') return;
        for (const u of c.g.unitsAtBf(l.i)) c.g.dealDamage(u, 4, c.self);
      },
    },
  ],
});
