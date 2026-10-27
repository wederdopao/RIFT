import { registerCard } from '../../engine/script';

// Hidden, Reaction: compre 2.
registerCard({
  code: 'OGN-083',
  keywords: { hidden: true, reaction: true },
  spell: {
    label: 'Consult the Past',
    resolve: function* (c) {
      yield* c.g.draw(c.p, 2);
    },
  },
});
