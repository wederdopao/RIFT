import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Entro pronta. Assault. Action — Descarte 1, [1][Fury]: bana-me e jogue-me na sua base, ignorando meu custo.
registerCard({
  code: 'RAD-021',
  keywords: { assault: 1 },
  entersReady: () => true,
  activated: [
    {
      label: 'Descartar 1, [1][Fury]: banir e jogar na base ignorando o custo',
      timing: 'action',
      cost: E(1, 'Fury'),
      canPayExtra: (c) => c.g.pl[c.p].hand.length > 0,
      extraCost: function* (c) {
        const d = yield* c.g.discard(c.p, 1, 'Ekko: descartar qual carta?');
        return d.length > 0;
      },
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'board') return;
        g.banishObj(c.self);
        yield* g.playFromEffect(c.p, c.self, E(0), { t: 'base', p: c.p });
      },
    },
  ],
});
