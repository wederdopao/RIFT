import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// VEN-091 Corrupted Dragon
// "If your score is not within 3 points of the Victory Score, I enter ready.
//  When I attack, you may move any number of enemy units here each with 5 [Might] or less to their base."
// As unidades movidas são alvos do gatilho (355.10; "você pode ... algum número": escolhidas como alvos, 355.12, 355.13),
// escolhidas ao pô-lo na pilha; Deflect e "não pode ser escolhida" valem. Na resolução, a que deixou de estar aqui ou
// passou de 5 de Might é alvo ilegal (359.3.e.5).
registerCard({
  code: 'VEN-091',
  entersReady: (g, self) => g.cfg.victoryScore - g.pl[self.controller].points > 3,
  triggers: [
    {
      on: 'attack',
      label: 'Corrupted Dragon: mover unidades inimigas aqui (Might <= 5) para a base',
      optional: 'Corrupted Dragon: mover unidades inimigas com 5 Might ou menos para a base delas?',
      cond: (c, ev) => ev.unit?.id === c.self.id && !ev.playerLevel,
      targets: [
        {
          prompt: 'Corrupted Dragon: mover quais unidades inimigas daqui (Might 5 ou menos) para a base delas?',
          min: 0,
          max: 99,
          filter: (c, o) => o.controller !== c.p && c.g.bfIndex(c.self) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self) && c.g.might(o) <= 5,
        },
      ],
      resolve: function* (c) {
        const g = c.g;
        const us = (c.targets[0] || []).filter((u) => u.zone === 'board');
        // um só movimento: todas ao mesmo tempo, cada uma para a base do seu controlador
        for (const q of [0, 1] as P[]) {
          const mine = us.filter((u) => u.controller === q);
          if (mine.length) g.moveUnits(mine, { t: 'base', p: q }, c.p);
        }
      },
    },
  ],
});
