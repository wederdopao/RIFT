import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Zed, From the Shadows
registerCard({
  code: 'VEN-023',
  optionalCosts: [
    {
      label: 'Descartar 1 como custo adicional (jogar um Shadow Clone)?',
      flag: 'discarded',
      canPay: (g, self, p) => g.pl[p].hand.some((id) => id !== self.id),
      pay: function* (c) {
        const d = yield* c.g.discard(c.p, 1, 'Zed: descarte 1');
        return d.length > 0;
      },
    },
  ],
  triggers: [
    {
      on: 'play',
      label: 'Jogar um Shadow Clone',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.discarded,
      resolve: function* (c) {
        const loc = yield* chooseTokenLoc(c, 'Zed: jogar o Shadow Clone onde?');
        if (loc) yield* c.g.playTokenG('TOK-SHADOWCLONE', c.p, loc);
      },
    },
  ],
});
