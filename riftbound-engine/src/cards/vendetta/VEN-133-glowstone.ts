import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import type { P } from '../../engine/types';

// VEN-133 Glowstone
// - "Choose a player": o jogador é alvo (355.9.a, 355.10), escolhido ao ativar (355.5), não na resolução.
// - "At the end of your turn, kill this and deal 5 to all units you control": "you" = quem controla o gatilho (c.p),
//   mesmo que a Glowstone já tenha saído do tabuleiro (aí o controle dela volta ao dono, 124.1).
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
      prepare: function* (c) {
        const g = c.g;
        const [q] = yield* g.ask(c.p, 'choose', 'Glowstone: qual jogador ganha o controle?', [
          { id: String(c.p), label: `${g.pname(c.p)} (você)` },
          { id: String(1 - c.p), label: g.pname((1 - c.p) as P) },
        ]);
        c.data.who = Number(q) as P;
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'board') return;
        const np = c.data.who as P;
        c.self.controller = np;
        g.recall(c.self);
        g.say(`${g.pname(np)} ganha o controle de Glowstone, que vai para a base dele (recall).`, np);
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
        if (c.self.zone === 'board') yield* g.killG(c.self);
        for (const u of g.units().filter((x) => x.controller === c.p)) g.dealDamage(u, 5, c.self);
      },
    },
  ],
});
