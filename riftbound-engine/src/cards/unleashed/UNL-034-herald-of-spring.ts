import { registerCard } from '../../engine/script';

// [Hunt] (quando eu conquisto ou seguro, meu controlador ganha 1 XP — palavra-chave tratada pelo motor, 823).
// Quando você me joga, ganhe 2 XP.
registerCard({
  code: 'UNL-034',
  keywords: { hunt: 1 },
  onPlay: [
    {
      label: 'Ganhar 2 XP',
      resolve: function* (c) {
        c.g.gainXp(c.p, 2, c.self);
      },
    },
  ],
});
