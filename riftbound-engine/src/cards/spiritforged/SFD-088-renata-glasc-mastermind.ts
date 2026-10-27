import { registerCard } from '../../engine/script';
import type { Engine } from '../../engine/engine';
import type { Obj } from '../../engine/types';

// [1][Mind]: Compre 1. [4][Mind][Mind][Mind][Mind], [Tap]: Marque 1 ponto. Use minhas habilidades só enquanto eu
// estiver num campo de batalha. (Sem [Action]/[Reaction]: só na fase principal do seu turno, com a pilha vazia.)
const atBf = (g: Engine, self: Obj) => self.zone === 'board' && g.bfIndex(self) >= 0;
registerCard({
  code: 'SFD-088',
  activated: [
    {
      label: 'Comprar 1',
      cost: { energy: 1, power: [['Mind']] },
      condition: atBf,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
    {
      label: 'Marcar 1 ponto',
      cost: { energy: 4, power: [['Mind'], ['Mind'], ['Mind'], ['Mind']] },
      exhaustSelf: true,
      condition: atBf,
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, c.g.name(c.self));
      },
    },
  ],
});
