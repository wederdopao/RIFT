import { registerCard } from '../../engine/script';
import { E, chooseTokenLoc } from '../helpers';

// [Repeat][2]. Jogue uma ficha de unidade Sand Soldier 2 (na sua base ou num campo que você controla, regras 185.2.a
// e 355.2.a). Com o Repeat pago, o efeito acontece de novo (outra ficha).
registerCard({
  code: 'SFD-031',
  repeat: E(2),
  spell: {
    label: "Desert's Call",
    resolve: function* (c) {
      const loc = yield* chooseTokenLoc(c, "Desert's Call: onde jogar a ficha Sand Soldier?");
      if (loc) yield* c.g.playTokenG('TOK-SAND', c.p, loc); // jogar ficha (Accelerate concedido, Rek'Sai)
    },
  },
});
