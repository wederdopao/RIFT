import { registerCard } from '../../engine/script';

// Quando você me joga, ganhe 1 XP.
registerCard({
  code: 'UNL-092',
  onPlay: [
    {
      label: 'Ganhar 1 XP',
      resolve: function* (c) {
        c.g.gainXp(c.p, 1, c.self);
      },
    },
  ],
});
