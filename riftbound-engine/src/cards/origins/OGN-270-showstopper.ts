import { registerCard } from '../../engine/script';
// Dê Buff a uma unidade aliada na sua base e depois mova-a para um campo de batalha.
registerCard({
  code: 'OGN-270',
  spell: {
    label: 'Showstopper',
    targets: [
      { prompt: 'Showstopper: Buff em qual unidade sua na base?', filter: (c, o) => o.controller === c.p && o.loc?.t === 'base' },
      { prompt: 'Showstopper: mover para qual campo de batalha?', kind: 'battlefield' },
    ],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      const bf = c.targets[1]?.[0];
      if (!u || u.zone !== 'board') return;
      g.buff(u, c.p);
      if (bf) g.moveUnits([u], { t: 'bf', i: g.bfOf(bf) }, c.p);
    },
  },
});
