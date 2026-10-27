import { registerCard } from '../../engine/script';
import { friendlyPermanents } from './_rad';

// Deploy. Ao jogar, pode matar outra unidade/gear aliado para comprar 1. Deathknells aliados aqui disparam uma vez a mais.
registerCard({
  code: 'RAD-017',
  keywords: { deploy: true },
  onPlay: [
    {
      label: 'Matar outra unidade ou gear seu para comprar 1',
      optional: 'Matar outra unidade ou gear seu para comprar 1?',
      resolve: function* (c) {
        const list = friendlyPermanents(c, c.self);
        if (!list.length) return;
        const [o] = yield* c.g.chooseObj(c.p, 'Detonation Amplifier: matar qual unidade ou gear seu?', list);
        const dead = yield* c.g.killG(o);
        if (dead.length) yield* c.g.draw(c.p, 1);
      },
    },
  ],
  auras: [
    {
      deathknellExtra: (g, src, p, dying) => {
        const i = g.bfIndex(src);
        return !!dying && src.zone === 'board' && i >= 0 && p === src.controller && dying.loc?.t === 'bf' && dying.loc.i === i ? 1 : 0;
      },
    },
  ],
});
