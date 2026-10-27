import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

// [Order]: Prepare-me e dê-me +1 Might neste turno. Use só se você escolheu uma unidade inimiga neste turno e só uma vez por turno.
// O "uma vez por turno" conta desde a ativação (não só a resolução).
registerCard({
  code: 'VEN-125',
  activated: [
    {
      label: 'Preparar-me e +1 Might',
      cost: E(0, 'Order'),
      condition: (g, self) =>
        (g.pl[self.controller].chooseLog || []).some((x) => x.turn === g.turn && (x.enemyUnits ?? 0) > 0) && self.data?.wolfTurn !== g.turn,
      extraCost: function* (c) {
        (c.self.data ||= {}).wolfTurn = c.g.turn;
        return true;
      },
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        c.g.ready(c.self, c.p);
        c.g.giveMight(c.self, 1);
      },
    },
  ],
});
