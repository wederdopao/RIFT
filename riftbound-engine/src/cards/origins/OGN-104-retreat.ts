import { registerCard } from '../../engine/script';

// Reaction: devolva uma unidade aliada à mão do dono. O dono canaliza 1 runa exaurida.
registerCard({
  code: 'OGN-104',
  keywords: { reaction: true },
  spell: {
    label: 'Retreat',
    targets: [{ prompt: 'Retreat: devolver qual unidade sua?', filter: (c, o) => o.controller === c.p }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      const owner = u.owner;
      c.g.returnToHand(u);
      c.g.channel(owner, 1, true);
    },
  },
});
