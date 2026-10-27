import { registerCard } from '../../engine/script';
import type { Loc } from '../../engine/types';

// Spell. Mova uma unidade inimiga de um campo de batalha para a base dela. Então, se houver uma unidade inimiga sozinha
// naquele campo, compre 1.
// - A unidade é alvo (355.7), escolhida ao jogar; o destino é fixo (a base do controlador dela).
// - "Then, if ... at that battlefield" é instrução ligada ao movimento (patch notes do Unleashed, Linking; regra 205): se
//   o movimento não aconteceu (impedido, ex.: Vilemaw's Lair), a compra também não acontece.
// - Sozinha = sem outras unidades aliadas dela no mesmo local (740.2.a); com uma inimiga só lá, ela está sozinha.
registerCard({
  code: 'UNL-124',
  spell: {
    label: 'Isolate',
    targets: [{ prompt: 'Isolate: mover qual unidade inimiga de um campo para a base dela?', filter: (c, o) => o.controller !== c.p && c.g.bfIndex(o) >= 0 }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      const i = g.bfIndex(u);
      if (i < 0) return;
      const to: Loc = { t: 'base', p: u.controller };
      g.moveUnits([u], to, c.p);
      if (!g.locEq(u.loc, to)) return; // o movimento não aconteceu: a instrução ligada é ignorada
      const alone = g.unitsAtBf(i).some((x) => x.controller !== c.p && g.isAlone(x));
      if (alone) yield* g.draw(c.p, 1);
    },
  },
});
