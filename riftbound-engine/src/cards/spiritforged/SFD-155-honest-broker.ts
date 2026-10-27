import { registerCard } from '../../engine/script';

// Deathknell: jogue uma ficha de gear Gold exaurida.
registerCard({
  code: 'SFD-155',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: ficha Gold exaurida',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
