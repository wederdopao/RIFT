import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Quando você me joga, os oponentes não podem jogar cartas neste turno.
registerCard({
  code: 'OGN-026',
  onPlay: [
    {
      label: 'Oponentes não podem jogar cartas neste turno',
      resolve: function* (c) {
        const q = (1 - c.p) as P;
        c.g.addEffect({ player: q, flag: 'cantPlay', until: 'turn' });
        c.g.say(`${c.g.pname(q)} não pode jogar cartas neste turno.`, c.p);
      },
    },
  ],
});
