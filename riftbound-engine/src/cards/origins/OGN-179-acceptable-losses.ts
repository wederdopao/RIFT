import { registerCard } from '../../engine/script';
import { opp } from '../../engine/engine';
import type { Obj } from '../../engine/types';

// Action: cada jogador mata um dos próprios gears.
// Não é alvo (regra 355.10.e): cada jogador escolhe na resolução, em ordem de turno começando pelo jogador do turno
// (303.2.a); as mortes acontecem juntas.
registerCard({
  code: 'OGN-179',
  keywords: { action: true },
  spell: {
    label: 'Acceptable Losses',
    resolve: function* (c) {
      const g = c.g;
      const chosen: Obj[] = [];
      for (const p of [g.active, opp(g.active)]) {
        const gear = g.gearOf(p);
        if (!gear.length) continue;
        const [o] = yield* g.chooseObj(p, 'Acceptable Losses: qual gear seu vai morrer?', gear);
        if (o) chosen.push(o);
      }
      yield* g.killG(chosen, 'é destruído (Acceptable Losses)'); // uma ação só: mortes simultâneas
    },
  },
});
