import { registerCard } from '../../engine/script';

// Reaction: cause 2 de dano a todas as unidades inimigas em combate.
registerCard({
  code: 'OGN-127',
  keywords: { reaction: true },
  spell: {
    label: 'Cannon Barrage',
    resolve: function* (c) {
      const g = c.g;
      const us = g.units().filter((u) => u.controller !== c.p && g.inCombat(u));
      if (!us.length) g.say('Cannon Barrage: nenhuma unidade inimiga em combate.');
      for (const u of us) g.dealDamage(u, 2, c.self);
    },
  },
});
