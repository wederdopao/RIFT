import { registerCard } from '../../engine/script';

// Unidade 1, Accelerate. Quando eu me movo para um campo de batalha, ganhe 2 XP.
// - Vale para qualquer movimento (padrão ou por efeito, da base ou de outro campo). Ser jogada num campo não é mover, e
//   recall não é movimento (455).
registerCard({
  code: 'UNL-127',
  keywords: { accelerate: true },
  triggers: [
    {
      on: 'move',
      label: 'Ganhar 2 XP',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.to?.t === 'bf',
      resolve: function* (c) {
        c.g.gainXp(c.p, 2);
      },
    },
  ],
});
