import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-144 Realm of Death
registerCard({
  code: 'RAD-144',
  spell: {
    label: 'Realm of Death',
    targets: [
      { prompt: 'Realm of Death: unidade inimiga (-2 Might)', filter: (c, o) => o.controller !== c.p },
      { prompt: 'Realm of Death: unidade aliada (+2 Might)', filter: (c, o) => o.controller === c.p },
    ],
    resolve: function* (c) {
      const g = c.g;
      const e = c.targets[0]?.[0];
      const f = c.targets[1]?.[0];
      // alvo que ficou ilegal: as outras instruções ainda valem (359.3.e.5/6); o dano mútuo precisa das duas
      if (e && e.zone === 'board') g.giveMight(e, -2, 'turn');
      if (f && f.zone === 'board') g.giveMight(f, 2, 'turn');
      if (!e || !f || e.zone !== 'board' || f.zone !== 'board') return;
      const de = Math.max(0, g.might(e));
      const df = Math.max(0, g.might(f));
      g.dealDamage(f, de, e, { byUnit: true });
      g.dealDamage(e, df, f, { byUnit: true });
    },
  },
});
