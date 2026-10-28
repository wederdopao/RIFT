import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Bottled Constellation — "At the start of your Main Phase, you may kill 3 other friendly units and/or gear to score 1
// point." Matar as 3 é o custo do gatilho (logo depois do "you may"): pago ao pô-lo na pilha (383.3.b, 383.3.b.1).
const others = (c: Ctx): Obj[] =>
  c.g.board().filter((o) => o.controller === c.p && o.id !== c.self.id && (c.g.isUnit(o) || c.g.isGear(o)));

registerCard({
  code: 'VEN-067',
  triggers: [
    {
      on: 'mainStart',
      label: 'Matar 3 outras unidades/gear aliados: ganhar 1 ponto',
      optional: 'Matar 3 outras unidades e/ou gear seus para ganhar 1 ponto?',
      cond: (c, ev) => ev.player === c.p,
      possible: (c) => others(c).length >= 3,
      canPayExtra: (c) => others(c).length >= 3,
      extraCost: function* (c) {
        const cands = others(c);
        if (cands.length < 3) return false;
        const picked = yield* c.g.chooseObj(c.p, 'Bottled Constellation: matar quais 3?', cands, 3, 3);
        if (picked.length < 3) return false;
        yield* c.g.killG(picked, 'é sacrificada');
        return true;
      },
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, 'Bottled Constellation');
      },
    },
  ],
});
