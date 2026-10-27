import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';
import { lookRevealUnit } from './UNL-032-double-trouble';

// Quando eu me movo para um campo de batalha, olhe as 3 cartas do topo do seu Main Deck. Você pode revelar uma unidade
// dentre elas e comprá-la. Recicle o resto.
// [Deathknell] Jogue uma unidade da sua mão na sua base, ignorando o custo de Energia dela (o de Power ainda é pago).
// - Olhar/revelar/comprar/reciclar: o mesmo caminho do Double Trouble e do Ivern, Nurturer (lookRevealUnit: lookAtTop,
//   beforeReveal, onReveal; reciclar várias juntas = fundo em ordem aleatória, 416.5).
// - Deathknell: a mão não é pública; a unidade é escolhida na resolução e o jogador pode não jogar nenhuma (regra
//   128.6; FAQ oficial do Unleashed). Energia zerada, Power pago (356.1.b.2; RiftJudge #10760).
registerCard({
  code: 'UNL-179',
  triggers: [
    {
      on: 'move',
      label: 'Olhar 3 do topo: comprar uma unidade e reciclar o resto',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.to?.t === 'bf',
      resolve: function* (c) {
        yield* lookRevealUnit(c.g, c.p, 'Rift Herald');
      },
    },
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: jogar uma unidade da mão na base, ignorando a energia',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const cost = (o: Obj) => ({ energy: 0, power: g.printedCost(o).power });
        const us = g.pl[c.p].hand.map((id) => g.objs[id]).filter((o) => g.isUnit(o) && g.canPay(c.p, g.effectCost(c.p, o, cost(o))));
        if (!us.length) return;
        const [u] = yield* g.chooseObj(c.p, 'Rift Herald: jogar qual unidade da mão na base? (pode não jogar)', us, 0, 1);
        if (u) yield* g.playFromEffect(c.p, u, cost(u), { t: 'base', p: c.p });
      },
    },
  ],
});
