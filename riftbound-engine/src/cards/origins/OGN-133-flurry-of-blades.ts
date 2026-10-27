import { registerCard } from '../../engine/script';

// Reaction: cause 1 de dano a todas as unidades em campos de batalha.
registerCard({
  code: 'OGN-133',
  keywords: { reaction: true },
  spell: {
    label: 'Flurry of Blades',
    resolve: function* (c) {
      for (const u of c.g.units().filter((x) => c.g.bfIndex(x) >= 0)) c.g.dealDamage(u, 1, c.self);
    },
  },
});
