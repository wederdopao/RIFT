import { registerCard } from '../../engine/script';

// Accelerate, Assault 2. Quando você me joga, descarte 2.
registerCard({
  code: 'OGN-030',
  keywords: { accelerate: true, assault: 2 },
  onPlay: [
    {
      label: 'Descartar 2',
      resolve: function* (c) {
        yield* c.g.discard(c.p, 2);
      },
    },
  ],
});
