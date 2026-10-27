import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Affectionate Poro
registerCard({
  code: 'VEN-024',
  triggers: [
    {
      on: 'combatEnd',
      label: 'Comprar 1 (não recebi dano neste turno)',
      cond: (c, ev) => (ev.units || []).includes(c.self.id) && c.self.damagedTurn !== c.g.turn,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
