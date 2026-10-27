import { registerCard } from '../../engine/script';
import { opp } from '../../engine/engine';
import type { Obj } from '../../engine/types';
import { xpOptionalCost } from '../helpers';

// Você pode gastar 3 XP como custo adicional para me jogar.
// Quando você me joga, cada jogador tem de matar uma das próprias unidades. Se você pagou o custo adicional, você não
// mata uma unidade assim.
// - Custo adicional opcional decidido ao jogar (355.1.a); gastar XP = reduzir o XP (730.2): xpOptionalCost.
// - Não é alvo: cada jogador escolhe na resolução, em ordem de turno, e as mortes são simultâneas (como Cull the Weak,
//   OGN-209). Sem pagar, eu mesmo posso ser a sua escolha, inclusive se for a sua única unidade (RiftJudge #11386,
//   #11053); pagando, só o oponente mata (#11053).
registerCard({
  code: 'UNL-164',
  optionalCosts: [xpOptionalCost(3, 'paidXp', 'Gastar 3 XP como custo adicional (assim você não mata uma unidade sua)?')],
  onPlay: [
    {
      label: 'Cada jogador mata uma das próprias unidades',
      resolve: function* (c) {
        const g = c.g;
        const paid = !!c.ev?.data?.paidXp;
        const dead: Obj[] = [];
        for (const p of [g.active, opp(g.active)]) {
          if (p === c.p && paid) continue;
          const us = g.units().filter((u) => u.controller === p);
          if (!us.length) continue;
          const [u] = yield* g.chooseObj(p, 'Safety Inspector: qual unidade sua vai morrer?', us);
          if (u) dead.push(u);
        }
        if (dead.length) yield* g.killG(dead);
      },
    },
  ],
});
