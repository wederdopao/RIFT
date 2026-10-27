import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-133',
  empower: E(0, 'any', 'any'),
  activated: [
    {
      label: 'Desempower, exaurir: um jogador ganha o controle disto',
      exhaustSelf: true,
      condition: (g, self) => self.empowered,
      canPayExtra: (c) => c.self.empowered,
      extraCost: function* (c) {
        c.g.disempower(c.self);
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'board') return;
        const [q] = yield* g.ask(c.p, 'choose', 'Glowstone: qual jogador ganha o controle?', [
          { id: String(c.p), label: g.pname(c.p) },
          { id: String(1 - c.p), label: g.pname((1 - c.p) as P) },
        ]);
        const np = Number(q) as P;
        c.self.controller = np;
        c.self.loc = { t: 'base', p: np };
        g.say(`${g.pname(np)} ganha o controle de Glowstone.`, np);
      },
    },
  ],
  triggers: [
    {
      on: 'turnEnd',
      label: 'Glowstone: matar e causar 5 às suas unidades',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        const g = c.g;
        const owner = c.self.controller;
        yield* g.killG(c.self);
        for (const u of g.units().filter((x) => x.controller === owner)) g.dealDamage(u, 5, c.self);
      },
    },
  ],
});
