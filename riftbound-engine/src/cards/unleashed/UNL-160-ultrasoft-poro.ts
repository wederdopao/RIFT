import { registerCard } from '../../engine/script';
import { chooseTokenLoc } from '../helpers';

// [Tap]: Jogue duas fichas de unidade Bird de 1 de Might com [Deflect]. Use esta habilidade só enquanto estou num campo
// de batalha.
// - Sem local no texto: cada ficha vai para a sua base ou um campo que você controla (185.2.a, 355.2.a), à sua escolha,
//   uma de cada vez (como Recruit the Vanguard, OGS-015).
// - "Só enquanto estou num campo" restringe a ativação (condition); depois de ativada, sair do campo não a desfaz.
registerCard({
  code: 'UNL-160',
  activated: [
    {
      label: 'Jogar duas fichas Bird (Deflect)',
      exhaustSelf: true,
      condition: (g, self) => g.bfIndex(self) >= 0,
      resolve: function* (c) {
        for (let k = 0; k < 2; k++) {
          const loc = yield* chooseTokenLoc(c, `Ultrasoft Poro: onde jogar a ficha Bird ${k + 1} de 2?`);
          if (loc) yield* c.g.playTokenG('TOK-BIRD', c.p, loc);
        }
      },
    },
  ],
});
