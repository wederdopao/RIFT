import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-154 Public Execution
registerCard({
  code: 'VEN-154',
  flow: E(5, 'any', 'any'),
  spell: {
    label: 'Public Execution',
    targets: [
      { prompt: 'Public Execution: escolha uma unidade aliada', filter: (c, o) => o.controller === c.p },
      { prompt: 'Public Execution: matar qual unidade inimiga com menos Might?', filter: (c, o) => o.controller !== c.p && !!c.targets[0]?.[0] && c.g.might(o) < c.g.might(c.targets[0][0]) },
    ],
    resolve: function* (c) {
      const f = c.targets[0]?.[0];
      const e = c.targets[1]?.[0];
      if (!f || !e || f.zone !== 'board' || e.zone !== 'board') return;
      if (c.g.might(e) < c.g.might(f)) yield* c.g.killG(e);
    },
  },
});
