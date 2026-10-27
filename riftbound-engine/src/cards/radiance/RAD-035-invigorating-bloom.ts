import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Ao jogar, dê +3 de Might a uma unidade aliada neste turno. Exaure uma unidade Mighty aliada, [Tap]: compre 1.
registerCard({
  code: 'RAD-035',
  onPlay: [
    {
      label: '+3 de Might a uma unidade aliada',
      targets: [T.friendlyUnit('Invigorating Bloom: +3 de Might em qual unidade sua?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 3);
      },
    },
  ],
  activated: [
    {
      label: 'Exaurir uma unidade Mighty sua, exaurir: comprar 1',
      exhaustSelf: true,
      canPayExtra: (c) => c.g.units().some((u) => u.controller === c.p && !u.exhausted && c.g.isMighty(u)),
      extraCost: function* (c) {
        const us = c.g.units().filter((u) => u.controller === c.p && !u.exhausted && c.g.isMighty(u));
        if (!us.length) return false;
        const [u] = yield* c.g.chooseObj(c.p, 'Invigorating Bloom: exaurir qual unidade Mighty sua?', us);
        c.g.exhaust(u);
        return true;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
