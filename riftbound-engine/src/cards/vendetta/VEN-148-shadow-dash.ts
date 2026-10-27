import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-148 Shadow Dash
registerCard({
  code: 'VEN-148',
  flow: E(5, 'any', 'any'),
  spell: {
    label: 'Shadow Dash',
    targets: [{ prompt: 'Shadow Dash: mover qual unidade inimiga?', filter: (c, o) => o.controller !== c.p }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      const idx = g.bfs.map((_, i) => i).filter((i) => g.unitsAtBf(i, c.p).length > 0);
      const i = yield* chooseBf(c, 'Shadow Dash: mover para qual campo onde você tem unidades?', idx);
      if (i < 0) return;
      g.moveUnits([u], { t: 'bf', i }, c.p);
      const mine = g.unitsAtBf(i, c.p);
      if (mine.length === 2) for (const m of mine) g.giveMight(m, 1, 'turn');
    },
  },
});
