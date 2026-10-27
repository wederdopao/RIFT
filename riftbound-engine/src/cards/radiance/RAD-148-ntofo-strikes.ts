import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-148 Ntofo Strikes
registerCard({
  code: 'RAD-148',
  keywords: { action: true },
  spell: {
    label: 'Ntofo Strikes',
    targets: [
      { prompt: 'Ntofo Strikes: unidade aliada (Shield 2)', filter: (c, o) => o.controller === c.p },
      { prompt: 'Ntofo Strikes: unidade inimiga', filter: (c, o) => o.controller !== c.p },
    ],
    resolve: function* (c) {
      const g = c.g;
      const f = c.targets[0]?.[0];
      const e = c.targets[1]?.[0];
      if (!f || f.zone !== 'board') return;
      g.giveKw(f, { shield: 2 }, 'turn');
      if (e && e.zone === 'board') {
        const n = g.kw(f).shield || 0;
        if (n > 0) g.dealDamage(e, n, c.self);
      }
    },
  },
});
