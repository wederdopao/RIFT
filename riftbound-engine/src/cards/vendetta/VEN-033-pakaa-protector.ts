import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Pakaa Protector
registerCard({
  code: 'VEN-033',
  triggers: [
    {
      on: 'move',
      label: 'Revelar o topo: unidade = comprar; senão descarte e +2 Might',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const [top] = yield* g.revealTop(c.p, 1);
        if (!top) return;
        if (g.isUnit(top)) yield* g.draw(c.p, 1);
        else {
          g.toZone(top, 'trash');
          g.giveMight(c.self, 2);
        }
      },
    },
  ],
});
