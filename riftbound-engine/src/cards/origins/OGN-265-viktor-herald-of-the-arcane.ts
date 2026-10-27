import { registerCard } from '../../engine/script';
import { E, chooseTokenLoc } from '../helpers';
// Lenda: [1], [Tap]: jogue uma ficha de unidade Recruit de 1 de Might.
// O texto não diz onde: a ficha é jogada como qualquer unidade (regras 185.2.a e 355.2.a), na sua base ou num
// campo que você controla, à escolha do jogador na resolução.
registerCard({
  code: 'OGN-265',
  activated: [
    {
      label: '[1], exaurir: jogar uma ficha Recruit',
      exhaustSelf: true,
      cost: E(1),
      resolve: function* (c) {
        const loc = yield* chooseTokenLoc(c, 'Viktor: jogar a ficha Recruit onde?');
        if (loc) yield* c.g.playTokenG('TOK-RECRUIT', c.p, loc);
      },
    },
  ],
});
