import { registerCard } from '../../engine/script';
import { bfIdx, chooseTokenLoc } from '../helpers';
// Campo: quando você conquista aqui, se você atribuiu 3 ou mais de dano excedente, jogue uma ficha de unidade Bird de 1 de
// Might com [Deflect].
// O dano excedente é o do combate que deu a conquista (sem combate, 0). Ficha sem local: a sua base ou um campo que você
// controla, à sua escolha (185.2.a, 355.2.a).
registerCard({
  code: 'UNL-217',
  triggers: [
    {
      on: 'conquer',
      label: 'Jogar uma ficha Bird com Deflect',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p && (ev.excess || 0) >= 3,
      resolve: function* (c) {
        const loc = yield* chooseTokenLoc(c, 'Trapping Grounds: onde jogar o Bird?');
        if (loc) yield* c.g.playTokenG('TOK-BIRD', c.p, loc);
      },
    },
  ],
});
