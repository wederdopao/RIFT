import { registerCard } from '../../engine/script';
import { chooseTokenLoc } from '../helpers';

// Jogue duas fichas Sprite de 3 de Might, prontas, com [Temporary].
// Sem local no texto: cada ficha vai para a sua base ou um campo que você controla (355.2.a), à sua escolha, e podem ir
// para locais diferentes (como o lembrete do Vanguard Armory). Jogar ficha passa por playTokenG (Zilean, Time Mage).
registerCard({
  code: 'UNL-069',
  spell: {
    label: 'Sprite Burst',
    resolve: function* (c) {
      for (let k = 0; k < 2; k++) {
        const loc = yield* chooseTokenLoc(c, `Sprite Burst: onde jogar o Sprite ${k + 1} de 2?`);
        if (loc) yield* c.g.playTokenG('TOK-SPRITE', c.p, loc, true);
      }
    },
  },
});
