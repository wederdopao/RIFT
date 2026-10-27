import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { P } from '../../engine/types';

// Escolha um campo de batalha inimigo ocupado. Jogue três fichas Recruit nele.
// "Choose" = alvo (355.7), escolhido ao jogar; campo inimigo = controlado pelo oponente; ocupado = com alguma unidade
// (170.11.a; como OGN-161/SFD-093). Se na resolução o campo deixou de ser inimigo ou ocupado, o alvo é ilegal e o spell
// não faz nada (359.3.e). O critério fica em `filter` porque é ele que o motor confere de novo na resolução.
const enemyOccupied = (g: Engine, p: P, i: number) => i >= 0 && g.bfs[i].controller === ((1 - p) as P) && g.unitsAtBf(i).length > 0;
registerCard({
  code: 'RAD-007',
  canPlay: (g, self, p) => g.bfs.some((_, i) => enemyOccupied(g, p, i)),
  spell: {
    label: 'Rally for War',
    targets: [
      {
        prompt: 'Rally for War: em qual campo inimigo ocupado?',
        kind: 'battlefield',
        filter: (c, o) => enemyOccupied(c.g, c.p, c.g.bfOf(o)),
      },
    ],
    resolve: function* (c) {
      const bf = c.targets[0]?.[0];
      if (!bf) return;
      const i = c.g.bfOf(bf);
      for (let k = 0; k < 3; k++) yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'bf', i });
    },
  },
});
