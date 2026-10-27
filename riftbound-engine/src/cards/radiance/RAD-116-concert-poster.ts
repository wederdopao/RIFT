import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-116',
  keywords: { deploy: true },
  triggers: [
    {
      on: 'play',
      label: 'Pagar [1] para jogar uma ficha Recruit na base',
      optional: 'Pagar [1] para jogar uma ficha Recruit na sua base?',
      cost: E(1),
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) { yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p }); },
    },
    {
      on: 'conquer',
      label: 'Pagar [1] para jogar uma ficha Recruit na base',
      optional: 'Pagar [1] para jogar uma ficha Recruit na sua base?',
      cost: E(1),
      cond: (c, ev) => ev.player === c.p && ev.bf === c.g.bfIndex(c.self),
      resolve: function* (c) { yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p }); },
    },
  ],
});
