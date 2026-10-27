import { registerCard } from '../../engine/script';

// Assault 2 (o lembrete da carta diz +2). Quando você me joga, descarte 1.
registerCard({
  code: 'OGN-003',
  keywords: { assault: 2 },
  onPlay: [
    {
      label: 'Descartar 1',
      resolve: function* (c) {
        yield* c.g.discard(c.p, 1);
      },
    },
  ],
});
