import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-078',
  keywords: { shield: 3, tank: true },
  triggers: [
    {
      on: 'move',
      label: 'Dano igual ao meu Shield a uma unidade num campo',
      optional: 'Causar dano igual ao seu Shield a uma unidade num campo de batalha?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [T.unitAtBf('Armored Tusker: dano em qual unidade num campo?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        const n = c.g.kw(c.self).shield || 0;
        if (u && n > 0) c.g.dealDamage(u, n, c.self);
      },
    },
  ],
});
