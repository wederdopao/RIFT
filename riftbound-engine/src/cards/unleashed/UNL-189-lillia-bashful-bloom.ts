import { registerCard, type Ctx } from '../../engine/script';
import { E, chooseTokenLoc } from '../helpers';
// Lenda: [4], [Tap]: jogue uma ficha de unidade Sprite de 3 de Might com [Temporary], pronta. Esta habilidade custa [1] a
// menos para cada unidade aliada com [Temporary].
// - Sem [Reaction]: só no seu turno, fora de showdown e com a pilha vazia. O desconto conta as suas unidades com
//   Temporary ao ativar (custo da habilidade; nunca abaixo de 0).
// - Ficha sem local especificado: a sua base ou um campo que você controla, à sua escolha (185.2.a, 355.2.a).
const temporaries = (c: Ctx) => c.g.units().filter((u) => u.controller === c.p && c.g.activeKw(u).temporary).length;
registerCard({
  code: 'UNL-189',
  activated: [
    {
      label: 'Exaurir: jogar uma ficha Sprite 3 pronta (custa [1] a menos por unidade aliada com Temporary)',
      exhaustSelf: true,
      cost: (c) => E(Math.max(0, 4 - temporaries(c))),
      resolve: function* (c) {
        const loc = yield* chooseTokenLoc(c, 'Lillia: onde jogar a Sprite?');
        if (loc) yield* c.g.playTokenG('TOK-SPRITE', c.p, loc, true);
      },
    },
  ],
});
