import { registerCard } from '../../engine/script';
import { chooseTokenLoc } from '../helpers';

// [Tap]: jogue três fichas Recruit de 1 de Might (podem ir para locais diferentes: sua base ou campos que você
// controla, regra 355.2.a). Habilidade sem Action: só no seu turno, fora de showdown e sem pilha.
registerCard({
  code: 'SFD-168',
  activated: [
    {
      label: 'Três fichas Recruit',
      exhaustSelf: true,
      resolve: function* (c) {
        for (let k = 0; k < 3; k++) {
          const loc = yield* chooseTokenLoc(c, `Vanguard Armory: onde jogar a ficha Recruit ${k + 1} de 3?`);
          if (loc) yield* c.g.playTokenG('TOK-RECRUIT', c.p, loc);
        }
      },
    },
  ],
});
