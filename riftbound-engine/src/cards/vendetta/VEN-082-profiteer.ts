import { registerCard } from '../../engine/script';
import type { Ctx } from '../../engine/script';
import type { Obj, P } from '../../engine/types';

// Quando você me joga, você pode desempoderar algo que você controla para empoderar uma lenda, unidade ou gear
// (de qualquer controlador). Desempoderar é o custo ("to"); o alvo do empower é escolhido na resolução.
const mine = (c: Ctx): Obj[] => {
  const g = c.g;
  const l = g.legendsOf(c.p);
  return [...g.board().filter((o) => o.controller === c.p && (g.isUnit(o) || g.isGear(o))), ...l];
};

registerCard({
  code: 'VEN-082',
  triggers: [
    {
      on: 'play',
      label: 'Profiteer: desempower algo seu para empower outro',
      optional: 'Profiteer: desempower algo seu para empower uma lenda, unidade ou gear?',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      canPayExtra: (c) => mine(c).some((o) => o.empowered),
      extraCost: function* (c) {
        const src = mine(c).filter((o) => o.empowered);
        if (!src.length) return false;
        const [d] = yield* c.g.chooseObj(c.p, 'Profiteer: desempower qual das suas?', src);
        if (!d) return false;
        c.g.disempower(d);
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        const dst = [...g.board().filter((o) => g.isUnit(o) || g.isGear(o)), ...([0, 1] as P[]).flatMap((pp) => g.legendsOf(pp))].filter((o) => !o.empowered);
        if (!dst.length) return;
        const [e] = yield* g.chooseObj(c.p, 'Profiteer: empower qual (lenda, unidade ou gear)?', dst);
        if (e) g.empowerObj(e, c.p);
      },
    },
  ],
});
