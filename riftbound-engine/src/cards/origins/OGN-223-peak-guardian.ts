import { registerCard } from '../../engine/script';

// Quando você me joga, me dê Buff. Depois, se eu estiver num campo de batalha, dê Buff a todas as outras unidades
// aliadas lá.
registerCard({
  code: 'OGN-223',
  onPlay: [
    {
      label: 'Buff em mim e nas aliadas do campo',
      resolve: function* (c) {
        const g = c.g;
        if (c.self.zone !== 'board') return;
        g.buff(c.self, c.p);
        const i = g.bfIndex(c.self);
        if (i < 0) return;
        for (const u of g.unitsAtBf(i, c.p)) if (u.id !== c.self.id) g.buff(u, c.p);
      },
    },
  ],
});
