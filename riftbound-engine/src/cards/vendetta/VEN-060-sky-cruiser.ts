import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Sky Cruiser
registerCard({
  code: 'VEN-060',
  activated: [
    {
      label: 'Descartar um gear, [1], Tap: 4 de dano',
      exhaustSelf: true,
      cost: E(1),
      canPayExtra: (c) => c.g.pl[c.p].hand.some((id) => c.g.isGear(c.g.objs[id])),
      extraCost: function* (c) {
        const gears = c.g.pl[c.p].hand.map((id) => c.g.objs[id]).filter((o) => c.g.isGear(o));
        if (!gears.length) return false;
        const [o] = yield* c.g.chooseObj(c.p, 'Sky Cruiser: descartar qual gear?', gears);
        if (!o) return false;
        c.g.discardObjs(c.p, [o]);
        return true;
      },
      targets: [T.unitAtBf('Sky Cruiser: 4 de dano em qual unidade num campo de batalha?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.dealDamage(u, 4, c.self);
      },
    },
  ],
});
