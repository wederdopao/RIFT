import { registerCard } from '../../engine/script';
import { opp } from '../../engine/engine';
import type { Obj } from '../../engine/types';

// Cada jogador mata uma das próprias unidades.
// Não é alvo (regra 355.10.e): cada jogador escolhe na resolução, em ordem de turno começando pelo jogador do turno
// (303.2.a); as mortes são simultâneas.
registerCard({
  code: 'OGN-209',
  spell: {
    label: 'Cull the Weak',
    resolve: function* (c) {
      const g = c.g;
      const dead: Obj[] = [];
      for (const p of [g.active, opp(g.active)]) {
        const us = g.units().filter((u) => u.controller === p);
        if (!us.length) continue;
        const [u] = yield* g.chooseObj(p, 'Cull the Weak: qual unidade sua vai morrer?', us);
        dead.push(u);
      }
      yield* g.killG(dead);
    },
  },
});
