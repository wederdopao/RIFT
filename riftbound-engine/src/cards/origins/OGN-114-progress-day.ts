import { registerCard } from '../../engine/script';

// Compre 4.
registerCard({
  code: 'OGN-114',
  spell: {
    label: 'Progress Day',
    resolve: function* (c) {
      yield* c.g.draw(c.p, 4);
    },
  },
});
