import { registerCard } from '../../engine/script';
import { opp } from '../../engine/engine';

// Começando pelo próximo jogador, cada outro jogador escolhe uma unidade que você não controla e que ainda não foi
// escolhida para este spell. Mate essas unidades. Não é alvo (regra 355.10.e): a escolha é feita na resolução.
// No 1x1 o único "outro jogador" é o oponente, então ele escolhe uma unidade que você não controla — é o texto exato.
registerCard({
  code: 'OGN-237',
  spell: {
    label: "King's Edict",
    resolve: function* (c) {
      const g = c.g;
      const o = opp(c.p);
      const us = g.units().filter((u) => u.controller !== c.p);
      if (!us.length) return;
      const chosen = yield* g.chooseObj(o, `King's Edict: escolha uma unidade que ${g.pname(c.p)} não controla (ela morre)`, us);
      yield* g.killG(chosen);
    },
  },
});
