import { registerCard } from '../../engine/script';
import { xpCost } from '../helpers';

// [Hunt] (quando eu conquisto ou seguro, ganhe 1 XP). Gaste 2 XP: [Buff] em mim (+1 se eu não tiver buff).
// - Hunt: o motor põe o gatilho na pilha na conquista/hold (823.1.c.1).
// - Ativada sem [Action]/[Reaction]: só na fase principal do seu turno, estado neutro aberto. Gastar XP é o custo
//   (203.1), pago ao finalizar (xpCost).
registerCard({
  code: 'UNL-162',
  keywords: { hunt: 1 },
  activated: [
    {
      label: 'Gastar 2 XP: Buff em mim',
      ...xpCost(2),
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.buff(c.self, c.p);
      },
    },
  ],
});
