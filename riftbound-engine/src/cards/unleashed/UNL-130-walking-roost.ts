import { registerCard } from '../../engine/script';
import { chooseTokenLoc } from '../helpers';
import type { P } from '../../engine/types';

// Unidade 6, Deflect. Quando você me joga, escolha um oponente. Ele joga uma ficha de unidade Bird de 1 de Might com
// [Deflect].
// - Quem joga a ficha é o oponente (é dele): o local é a base dele ou um campo que ele controla, à escolha dele
//   (185.2.a, 355.2.a). A ficha Bird já tem Deflect (187.7). No 1x1 o único oponente é escolhido sem pergunta.
registerCard({
  code: 'UNL-130',
  keywords: { deflect: 1 },
  onPlay: [
    {
      label: 'O oponente joga uma ficha Bird',
      resolve: function* (c) {
        const op = (1 - c.p) as P;
        const loc = yield* chooseTokenLoc({ ...c, p: op }, 'Walking Roost: onde jogar a sua ficha Bird?');
        if (loc) yield* c.g.playTokenG('TOK-BIRD', op, loc);
      },
    },
  ],
});
