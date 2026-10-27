import { registerCard } from '../../engine/script';

// Quando você me joga, mate uma unidade inimiga.
registerCard({
  code: 'OGN-234',
  onPlay: [
    {
      label: 'Matar uma unidade inimiga',
      targets: [{ prompt: 'Harnessed Dragon: matar qual unidade inimiga?', filter: (c, o) => o.controller !== c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) yield* c.g.killG(u);
      },
    },
  ],
});
