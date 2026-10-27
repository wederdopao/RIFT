import { registerCard } from '../../engine/script';

// Canalize 1 runa exaurida. Se não puder, compre 1.
registerCard({
  code: 'OGN-134',
  spell: {
    label: 'Mobilize',
    resolve: function* (c) {
      if (c.g.channel(c.p, 1, true) < 1) yield* c.g.draw(c.p, 1);
    },
  },
});
