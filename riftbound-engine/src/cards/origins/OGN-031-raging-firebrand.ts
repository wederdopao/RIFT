import { registerCard } from '../../engine/script';

// Quando você me joga, a próxima spell que você jogar neste turno custa [5] a menos.
registerCard({
  code: 'OGN-031',
  onPlay: [
    {
      label: 'A próxima spell custa 5 a menos',
      resolve: function* (c) {
        c.g.addEffect({ player: c.p, nextPlay: 'spell', costMod: -5, until: 'turn' });
        c.g.say(`A próxima spell de ${c.g.pname(c.p)} neste turno custa 5 a menos.`, c.p);
      },
    },
  ],
});
