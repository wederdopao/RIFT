import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você segura aqui, jogue uma ficha de unidade Recruit 1 na sua base.
registerCard({
  code: 'OGN-275',
  triggers: [
    {
      on: 'hold',
      label: 'Jogar uma ficha Recruit na base',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
