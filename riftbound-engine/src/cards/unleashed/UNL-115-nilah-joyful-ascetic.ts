import { registerCard } from '../../engine/script';

// [Accelerate], [Ganking]. Quando eu me movo, ganhe 1 XP (qualquer movimento: padrão ou por efeito, para a base também).
registerCard({
  code: 'UNL-115',
  keywords: { accelerate: true, ganking: true },
  triggers: [
    {
      on: 'move',
      label: 'Ganhar 1 XP',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        c.g.gainXp(c.p, 1, c.self);
      },
    },
  ],
});
