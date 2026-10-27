import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Shen, Scourge of Shadows
registerCard({
  code: 'VEN-042',
  triggers: [
    {
      on: 'hold',
      label: 'Comprar 1 (exatamente uma outra unidade aqui)',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id) && (ev.units || []).length === 2,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
