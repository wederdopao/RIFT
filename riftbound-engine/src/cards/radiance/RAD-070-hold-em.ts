import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-070',
  keywords: { action: true },
  // [2] a menos se você jogou uma unidade ou gear para um campo de batalha neste turno (rastreado pelo motor, fichas incluídas).
  selfCostMod: (g, self, p) => (g.playedToBfThisTurn(p) ? -2 : 0),
  spell: {
    label: "Hold 'Em",
    targets: [{ prompt: "Hold 'Em: +3 de Might em qual unidade?" }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u && u.zone === 'board') c.g.giveMight(u, 3);
    },
  },
});
