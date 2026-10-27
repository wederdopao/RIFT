import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { P } from '../../engine/types';

/** Quantas das tags Bird, Cat, Dog e Poro existem entre as unidades de p no tabuleiro (cada tag conta uma vez). */
export const petTags = (g: Engine, p: P) => {
  const mine = g.units().filter((u) => u.controller === p);
  return ['Bird', 'Cat', 'Dog', 'Poro'].filter((t) => mine.some((u) => g.hasTag(u, t))).length;
};

// [Reaction]. Escolha uma unidade. Dê +1 de Might a ela neste turno para cada uma destas tags entre as suas unidades —
// Bird, Cat, Dog e Poro. A contagem é feita na resolução (359.3.d); a unidade escolhida conta se for sua.
registerCard({
  code: 'UNL-046',
  keywords: { reaction: true },
  spell: {
    label: 'Friendship',
    targets: [{ prompt: 'Friendship: escolha uma unidade' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      const n = petTags(c.g, c.p);
      if (n) c.g.giveMight(u, n);
      else c.g.say('Friendship: nenhuma das tags Bird, Cat, Dog ou Poro entre as suas unidades.', c.p);
    },
  },
});
