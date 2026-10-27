import { registerCard } from '../../engine/script';

// Canalize 2 runas exauridas. Se não conseguiu canalizar 2 assim, compre 1.
registerCard({
  code: 'OGN-138',
  spell: {
    label: 'Catalyst of Aeons',
    resolve: function* (c) {
      if (c.g.channel(c.p, 2, true) < 2) yield* c.g.draw(c.p, 1);
    },
  },
});
