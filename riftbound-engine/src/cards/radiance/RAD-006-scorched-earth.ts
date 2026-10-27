import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';

// Action. Cause 5 de dano dividido entre unidades de um único campo de batalha.
registerCard({
  code: 'RAD-006',
  keywords: { action: true },
  spell: {
    label: 'Scorched Earth',
    prepare: function* (c) {
      const g = c.g;
      const bfs = g.bfs.map((_, i) => i).filter((i) => g.unitsAtBf(i).length > 0);
      if (!bfs.length) return false;
      const [id] = yield* g.ask(c.p, 'choose', 'Scorched Earth: em qual campo de batalha?', bfs.map((i) => ({ id: String(i), label: g.locName({ t: 'bf', i }), obj: g.bfs[i].objId })));
      c.data.bf = Number(id);
      return true;
    },
    targets: (c) => [
      {
        prompt: 'Scorched Earth: dividir 5 de dano entre quais unidades?',
        filter: (cc, o) => atBf(cc, o) && (c.data.bf === undefined || cc.g.bfIndex(o) === c.data.bf),
        min: 1,
        max: c.g.splitMaxTargets(c.self, 5),
      },
    ],
    resolve: function* (c) {
      yield* c.g.dealSplit(c.p, c.self, 5, c.targets[0], 'Scorched Earth');
    },
  },
  canPlay: (g) => g.units().some((u) => g.bfIndex(u) >= 0),
});
