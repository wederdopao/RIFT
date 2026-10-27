import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Bottled Constellation
registerCard({
  code: 'VEN-067',
  triggers: [
    {
      on: 'mainStart',
      label: 'Matar 3 outras unidades/gear aliados: ganhar 1 ponto',
      optional: 'Matar 3 outras unidades e/ou gear seus para ganhar 1 ponto?',
      cond: (c, ev) => ev.player === c.p,
      possible: (c) => c.g.board().filter((o) => o.controller === c.p && o.id !== c.self.id && (c.g.isUnit(o) || c.g.isGear(o))).length >= 3,
      resolve: function* (c) {
        const g = c.g;
        const cands = g.board().filter((o) => o.controller === c.p && o.id !== c.self.id && (g.isUnit(o) || g.isGear(o)));
        if (cands.length < 3) return;
        const picked = yield* g.chooseObj(c.p, 'Bottled Constellation: matar quais 3?', cands, 3, 3);
        yield* g.killG(picked);
        g.gainPoints(c.p, 1, 'Bottled Constellation');
      },
    },
  ],
});
