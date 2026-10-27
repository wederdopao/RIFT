import { registerCard } from '../../engine/script';

// Tank. Quando você me joga, canalize 1 runa exaurida.
registerCard({
  code: 'OGN-137',
  keywords: { tank: true },
  onPlay: [
    {
      label: 'Canalizar 1 runa exaurida',
      resolve: function* (c) {
        c.g.channel(c.p, 1, true);
      },
    },
  ],
});
