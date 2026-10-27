import { registerCard } from '../../engine/script';
import { chooseTokenLoc } from '../helpers';
// Action: jogue quatro fichas de unidade Recruit 1 (na sua base ou em campos que você controla).
registerCard({
  code: 'OGS-015',
  keywords: { action: true },
  spell: {
    label: 'Recruit the Vanguard',
    resolve: function* (c) {
      for (let k = 0; k < 4; k++) {
        const loc = yield* chooseTokenLoc(c, `Recruit the Vanguard: onde jogar a ficha Recruit ${k + 1} de 4?`);
        if (loc) yield* c.g.playTokenG('TOK-RECRUIT', c.p, loc);
      }
    },
  },
});
