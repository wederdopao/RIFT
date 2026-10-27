import { registerCard } from '../../engine/script';

// Quando eu conquisto, jogue uma ficha de gear Gold exaurida.
registerCard({
  code: 'SFD-069',
  triggers: [
    {
      on: 'conquer',
      label: 'Jogar uma ficha de Gold',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
