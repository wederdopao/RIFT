import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// [Tap]: compre 1 e canalize 1 runa exausta. Quando fico exaurido, dê +3 de Might a uma unidade aliada neste turno.
registerCard({
  code: 'RAD-046',
  activated: [
    {
      label: 'Exaurir: comprar 1 e canalizar 1 runa exausta',
      exhaustSelf: true,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
        c.g.channel(c.p, 1, true);
      },
    },
  ],
  triggers: [
    {
      on: 'exhaust',
      label: '+3 de Might a uma unidade aliada',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [T.friendlyUnit('Resplendent Rostrum: +3 de Might em qual unidade sua?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 3);
      },
    },
  ],
});
