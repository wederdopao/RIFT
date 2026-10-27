import { registerCard } from '../../engine/script';

// Action: mate todo gear.
registerCard({
  code: 'OGN-022',
  keywords: { action: true },
  spell: {
    label: 'Thermo Beam',
    resolve: function* (c) {
      const gear = c.g.board().filter((o) => c.g.isGear(o));
      if (!gear.length) c.g.say('Thermo Beam: não há gear em jogo.');
      yield* c.g.killG(gear, 'é destruído'); // "mate todos": mortes simultâneas
    },
  },
});
