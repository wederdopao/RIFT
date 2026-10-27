import { registerCard } from '../../engine/script';

// Quando eu me movo, jogue uma ficha de gear Gold exaurida (na sua base: gear sem local especificado).
registerCard({
  code: 'SFD-130',
  triggers: [
    {
      on: 'move',
      label: 'Ficha Gold exaurida',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
