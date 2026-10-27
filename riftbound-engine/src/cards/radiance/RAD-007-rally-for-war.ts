import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Escolha um campo de batalha inimigo ocupado. Jogue três fichas Recruit nele.
registerCard({
  code: 'RAD-007',
  canPlay: (g, self, p) => g.bfs.some((_, i) => g.bfs[i].controller === ((1 - p) as P) && g.unitsAtBf(i).length > 0),
  spell: {
    label: 'Rally for War',
    prepare: function* (c) {
      const g = c.g;
      const bfs = g.bfs.map((_, i) => i).filter((i) => g.bfs[i].controller === ((1 - c.p) as P) && g.unitsAtBf(i).length > 0);
      if (!bfs.length) return false;
      const [id] = yield* g.ask(c.p, 'choose', 'Rally for War: em qual campo inimigo ocupado?', bfs.map((i) => ({ id: String(i), label: g.locName({ t: 'bf', i }), obj: g.bfs[i].objId })));
      c.data.bf = Number(id);
      return true;
    },
    resolve: function* (c) {
      if (c.data.bf === undefined) return;
      for (let k = 0; k < 3; k++) yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'bf', i: c.data.bf });
    },
  },
});
