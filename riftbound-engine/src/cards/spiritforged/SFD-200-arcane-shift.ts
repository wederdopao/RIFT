import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { atBf } from '../helpers';
// Action. Bana uma unidade aliada; então o dono dela a joga, ignorando o custo. Cause 3 a uma unidade inimiga num
// campo. Bana isto.
// - Dois alvos, escolhidos ao jogar (regra 355.7). O dono (que pode não ser você) joga a unidade banida e escolhe o
//   local (a base dele ou um campo que ele controla, regra 355.2.a); ficha banida deixa de existir e não é jogada.
// - "Bana isto": o spell vai para o banimento em vez do descarte, mesmo se os alvos ficarem inválidos (359.3.e.6).
registerCard({
  code: 'SFD-200',
  keywords: { action: true },
  spell: {
    label: 'Arcane Shift',
    targets: [
      { prompt: 'Arcane Shift: banir qual unidade aliada?', filter: (c, o) => o.controller === c.p },
      { prompt: 'Arcane Shift: 3 de dano em qual unidade inimiga num campo?', filter: (c, o) => o.controller !== c.p && atBf(c, o) },
    ],
    alwaysResolve: true,
    resolve: function* (c) {
      const g = c.g;
      const mine = c.targets[0]?.[0];
      if (mine && mine.zone === 'board') {
        const owner = mine.owner;
        g.banishObj(mine);
        if ((mine.zone as string) === 'banish') yield* g.playFromEffect(owner, mine, NO_COST);
      }
      const foe = c.targets[1]?.[0];
      if (foe) g.dealDamage(foe, 3, c.self);
      if (c.self.zone === 'chain') g.banishObj(c.self);
    },
  },
});
