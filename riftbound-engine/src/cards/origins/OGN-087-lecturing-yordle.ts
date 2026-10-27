import { registerCard } from '../../engine/script';

// Tank. Quando você me joga, compre 1.
registerCard({
  code: 'OGN-087',
  keywords: { tank: true },
  onPlay: [
    {
      label: 'Comprar 1',
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
