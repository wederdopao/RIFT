import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-144 Death Mark
import { chooseTokenLoc } from '../helpers';
registerCard({
  code: 'VEN-144',
  flow: E(1, 'any', 'any'),
  spell: {
    label: 'Death Mark',
    resolve: function* (c) {
      c.g.burn(c.p, 3);
      const loc = yield* chooseTokenLoc(c, 'Death Mark: jogar a Shadow Clone onde?');
      if (loc) yield* c.g.playTokenG('TOK-SHADOWCLONE', c.p, loc);
    },
  },
});
