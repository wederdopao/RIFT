import { registerCard } from '../../engine/script';
import { E, T } from '../helpers';

// Prepare uma unidade. Quando você joga uma carta com custo de Energia 7+, pode jogar isto do descarte por [1][Fury][Fury]; bana isto.
registerCard({
  code: 'RAD-010',
  spell: {
    label: 'Forbidden Technique',
    targets: [T.anyUnit('Forbidden Technique: preparar qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.ready(u, c.p);
    },
  },
  triggers: [
    {
      on: 'cardPlayed',
      zone: 'trash',
      label: 'Jogar Forbidden Technique do descarte por [1][Fury][Fury]',
      optional: 'Jogar Forbidden Technique do descarte por [1][Fury][Fury]? (será banida)',
      cond: (c, ev) => ev.player === c.p && c.self.owner === c.p && c.g.data(ev.obj).energy >= 7,
      possible: (c) => c.self.zone === 'trash' && c.g.canPay(c.p, E(1, 'Fury', 'Fury'), true) && c.g.units().length > 0,
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'trash') return;
        const ok = yield* g.playFromEffect(c.p, c.self, E(1, 'Fury', 'Fury'));
        void ok;
        const it = g.chain.find((x) => x.cardId === c.self.id);
        if (it) it.flow = true; // vai para o banimento ao resolver
      },
    },
  ],
});
