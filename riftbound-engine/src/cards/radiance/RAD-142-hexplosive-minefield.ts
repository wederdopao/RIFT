import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-142 Hexplosive Minefield
registerCard({
  code: 'RAD-142',
  keywords: { action: true },
  spell: {
    label: 'Hexplosive Minefield',
    resolve: function* (c) {
      const g = c.g;
      const bombs = g.board().filter((o) => o.code === 'TOK-BOMB' && o.controller === c.p);
      const picks = bombs.length ? yield* g.chooseObj(c.p, 'Hexplosive Minefield: matar quantas Bombs suas?', bombs, 0, bombs.length) : [];
      if (!picks.length) return;
      const n = picks.length;
      yield* g.killG(picks);
      g.addDelayed({
        controller: c.p,
        sourceId: c.self.id,
        on: 'turnEnd',
        once: true,
        untilTurn: g.turn,
        ability: {
          label: 'Jogar Bombs',
          resolve: function* (cc) {
            const i = yield* chooseBf(cc, 'Hexplosive Minefield: jogar as Bombs em qual campo?', cc.g.bfs.map((_, k) => k));
            if (i < 0) return;
            for (let k = 0; k < n; k++) cc.g.createToken('TOK-BOMB', cc.p, { t: 'bf', i });
          },
        },
      });
    },
  },
});
