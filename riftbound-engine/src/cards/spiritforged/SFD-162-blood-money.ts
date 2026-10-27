import { registerCard } from '../../engine/script';
import type { Obj } from '../../engine/types';

// Action. Mate uma unidade num campo de batalha com 2 de Might ou menos. Se era uma unidade inimiga, jogue uma ficha
// Gold exaurida; se era aliada, duas.
// O alvo é escolhido ao jogar e a restrição (campo, 2 de Might ou menos) é checada de novo na resolução. "Se era" olha
// quem controlava a unidade ao matá-la e não depende de ela morrer de fato (não diz "se fizer"): se uma substituição
// salvar a unidade, as fichas ainda vêm — leitura literal do texto.
registerCard({
  code: 'SFD-162',
  keywords: { action: true },
  spell: {
    label: 'Blood Money',
    targets: [
      {
        prompt: 'Blood Money: matar qual unidade num campo (2 de Might ou menos)?',
        filter: (c, o) => c.g.bfIndex(o) >= 0 && c.g.might(o) <= 2,
      },
    ],
    resolve: function* (c) {
      const g = c.g;
      const u: Obj | undefined = c.targets[0][0];
      if (!u) return;
      const enemy = u.controller !== c.p;
      yield* g.killG(u);
      for (let k = 0; k < (enemy ? 1 : 2); k++) g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
    },
  },
});
