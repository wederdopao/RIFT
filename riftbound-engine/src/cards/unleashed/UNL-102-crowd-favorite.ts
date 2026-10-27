import { registerCard } from '../../engine/script';
import { xpCost } from '../helpers';

// [Hunt]. Gaste 2 XP: [Buff] em mim.
// Habilidade ativada sem palavra-chave de timing: fase principal do seu turno, estado aberto. Gastar XP é o custo (203.1,
// 730.2), pago ao ativar; o Buff acontece na resolução (sem efeito se eu já tiver um buff, ou se saí do tabuleiro).
registerCard({
  code: 'UNL-102',
  keywords: { hunt: 1 },
  activated: [
    {
      ...xpCost(2),
      label: 'Gastar 2 XP: Buff em mim',
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.buff(c.self, c.p);
      },
    },
  ],
});
