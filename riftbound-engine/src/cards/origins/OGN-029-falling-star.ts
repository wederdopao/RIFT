import { registerCard } from '../../engine/script';

// Cause 3 a uma unidade. Cause 3 a uma unidade. (Pode ser a mesma ou outra.)
registerCard({
  code: 'OGN-029',
  spell: {
    label: 'Falling Star',
    targets: [{ prompt: 'Falling Star: 3 de dano em qual unidade (1ª)?' }, { prompt: 'Falling Star: 3 de dano em qual unidade (2ª)?' }],
    resolve: function* (c) {
      const a = c.targets[0][0];
      if (a) c.g.dealDamage(a, 3, c.self);
      const b = c.targets[1]?.[0];
      if (b) c.g.dealDamage(b, 3, c.self);
    },
  },
});
