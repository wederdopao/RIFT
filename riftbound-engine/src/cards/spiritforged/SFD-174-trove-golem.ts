import { registerCard } from '../../engine/script';

// Quando você me joga, jogue quatro fichas de gear Gold exauridas.
registerCard({
  code: 'SFD-174',
  onPlay: [
    {
      label: 'Quatro fichas Gold exauridas',
      resolve: function* (c) {
        for (let k = 0; k < 4; k++) c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
