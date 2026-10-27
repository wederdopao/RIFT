import { registerCard } from '../../engine/script';
import { chooseTokenLoc } from '../helpers';

// [Tap]: Gold exausta. Mate um gear aliado, [Tap]: ficha Recruit. Mate uma unidade aliada, [Tap]: ficha Mech de 3.
registerCard({
  code: 'RAD-022',
  activated: [
    {
      label: 'Exaurir: jogar uma ficha Gold exausta',
      exhaustSelf: true,
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
    {
      label: 'Matar um gear seu, exaurir: jogar uma ficha Recruit',
      exhaustSelf: true,
      canPayExtra: (c) => c.g.gearOf(c.p).length > 0,
      extraCost: function* (c) {
        const gs = c.g.gearOf(c.p);
        if (!gs.length) return false;
        const [o] = yield* c.g.chooseObj(c.p, 'Whirling Twirligig: matar qual gear seu?', gs);
        yield* c.g.killG(o);
        return true;
      },
      resolve: function* (c) {
        const loc = yield* chooseTokenLoc(c, 'Jogar a ficha Recruit onde?');
        if (loc) yield* c.g.playTokenG('TOK-RECRUIT', c.p, loc);
      },
    },
    {
      label: 'Matar uma unidade sua, exaurir: jogar uma ficha Mech de 3',
      exhaustSelf: true,
      canPayExtra: (c) => c.g.units().some((u) => u.controller === c.p),
      extraCost: function* (c) {
        const us = c.g.units().filter((u) => u.controller === c.p);
        if (!us.length) return false;
        const [o] = yield* c.g.chooseObj(c.p, 'Whirling Twirligig: matar qual unidade sua?', us);
        yield* c.g.killG(o);
        return true;
      },
      resolve: function* (c) {
        const loc = yield* chooseTokenLoc(c, 'Jogar a ficha Mech onde?');
        if (loc) yield* c.g.playTokenG('TOK-MECH', c.p, loc);
      },
    },
  ],
});
