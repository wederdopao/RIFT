import { registerCard } from '../../engine/script';

// Legion – quando você me joga, descarte 2 e depois compre 2.
registerCard({
  code: 'OGN-020',
  onPlay: [
    {
      label: 'Legion: descartar 2, comprar 2',
      prepare: function* (c) {
        return c.g.legion(c.self, c.p);
      },
      resolve: function* (c) {
        yield* c.g.discard(c.p, 2);
        yield* c.g.draw(c.p, 2);
      },
    },
  ],
});
