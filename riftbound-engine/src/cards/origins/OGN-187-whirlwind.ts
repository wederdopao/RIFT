import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Começando pelo próximo jogador, cada jogador pode devolver uma unidade para a mão do dono.
// Não é alvo (regra 355.10.e): escolhas na resolução, uma de cada vez, qualquer unidade no tabuleiro; Deflect e
// "não pode ser escolhida" não se aplicam (riftjudge FAQ #3384 e #9057).
registerCard({
  code: 'OGN-187',
  spell: {
    label: 'Whirlwind',
    resolve: function* (c) {
      const g = c.g;
      for (const p of [(1 - c.p) as P, c.p]) {
        const us = g.units();
        if (!us.length) continue;
        const [u] = yield* g.chooseObj(p, 'Whirlwind: você pode devolver uma unidade para a mão do dono (ou nenhuma)', us, 0, 1);
        if (u) g.returnToHand(u);
      }
    },
  },
});
