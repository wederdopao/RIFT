import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-112',
  triggers: [
    {
      on: 'conquer',
      label: 'Zed: jogar ficha Shadow Clone na base',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-SHADOWCLONE', c.p, { t: 'base', p: c.p });
      },
    },
  ],
  activated: [
    {
      label: 'Trocar de lugar com um Shadow Clone',
      timing: 'action',
      cost: E(1, 'Chaos'),
      targets: [{ prompt: 'Zed: trocar com qual Shadow Clone seu?', filter: (c, o) => o.controller === c.p && o.code === 'TOK-SHADOWCLONE' }],
      resolve: function* (c) {
        const clone = c.targets[0][0];
        if (!clone || clone.zone !== 'board' || c.self.zone !== 'board' || !clone.loc || !c.self.loc) return;
        const a = c.self.loc;
        const b = clone.loc;
        yield* c.g.moveUnitsG([c.self], b, c.p); // custo aplicado ao movimento: quem move escolhe pagar (204.4)
        yield* c.g.moveUnitsG([clone], a, c.p);
      },
    },
  ],
});
