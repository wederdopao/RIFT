import { registerCard, type Ctx } from '../../engine/script';
import type { Obj } from '../../engine/types';
import { E, atBf } from '../helpers';

// Repeat [2][Fury]. Cause 2 de dano a uma unidade num campo de batalha, depois cause 2 a até uma outra unidade.
// Os dois são alvos escolhidos ao jogar; a segunda pode ser qualquer outra unidade (não precisa estar num campo) e pode
// ficar sem alvo ("até uma", 355.13). Com Repeat, a segunda execução escolhe os próprios alvos.
/** Primeiro alvo desta execução (na resolução, o da pilha: com Repeat cada execução tem os seus). */
const first = (c: Ctx): string | undefined => {
  // caça UNL: com mais de um Repeat (impresso + The Academy/Temporal Portal/Syndra) a execução c.rep >= 2 tem os alvos
  // em moreRepeats (820.3)
  if (c.item) return (c.rep === 0 ? c.item.targetIds : c.rep === 1 ? c.item.repeatIds : c.item.moreRepeats?.[c.rep - 2]?.ids)?.[0]?.[0];
  return c.targets[0]?.[0]?.id;
};
registerCard({
  code: 'SFD-023',
  repeat: E(2, 'Fury'),
  spell: {
    label: 'Piercing Light',
    targets: [
      { prompt: 'Piercing Light: 2 de dano em qual unidade num campo?', filter: (c, o) => atBf(c, o) },
      { prompt: 'Piercing Light: 2 de dano em até uma outra unidade', min: 0, max: 1, filter: (c, o: Obj) => o.id !== first(c) },
    ],
    resolve: function* (c) {
      const a = c.targets[0][0];
      const b = c.targets[1]?.[0];
      if (a) c.g.dealDamage(a, 2, c.self);
      if (b) c.g.dealDamage(b, 2, c.self);
    },
  },
});
