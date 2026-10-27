import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';

// Reaction. Dê a uma unidade aliada num campo de batalha +2 de Might neste turno para cada unidade inimiga lá.
// As unidades inimigas são contadas na resolução, no campo onde a unidade está nesse momento.
registerCard({
  code: 'SFD-001',
  keywords: { reaction: true },
  spell: {
    label: 'Against the Odds',
    targets: [{ prompt: 'Against the Odds: qual unidade sua num campo de batalha?', filter: (c, o) => o.controller === c.p && atBf(c, o) }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u) return;
      const i = g.bfIndex(u);
      const n = g.unitsAtBf(i).filter((x) => x.controller !== c.p).length;
      if (n) g.giveMight(u, 2 * n);
      else g.say(`Against the Odds: não há unidades inimigas com ${g.name(u)}.`, c.p);
    },
  },
});
