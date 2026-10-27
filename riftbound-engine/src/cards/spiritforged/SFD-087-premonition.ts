import { registerCard } from '../../engine/script';

// Reaction. Compre 3.
registerCard({
  code: 'SFD-087',
  keywords: { reaction: true },
  spell: {
    label: 'Premonition',
    resolve: function* (c) {
      yield* c.g.draw(c.p, 3);
    },
  },
});
