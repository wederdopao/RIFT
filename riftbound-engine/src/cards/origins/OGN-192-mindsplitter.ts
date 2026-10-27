import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Quando você me joga, escolha um oponente. Ele revela a mão; escolha uma carta dela e ele a descarta.
registerCard({
  code: 'OGN-192',
  onPlay: [
    {
      label: 'O oponente revela a mão e descarta a carta que você escolher',
      resolve: function* (c) {
        const g = c.g;
        const o = (1 - c.p) as P;
        const hand = g.pl[o].hand.map((id) => g.objs[id]);
        if (!hand.length) {
          g.say(`${g.pname(o)} revela a mão: vazia.`, o);
          return;
        }
        g.say(`${g.pname(o)} revela a mão: ${hand.map((x) => g.name(x)).join(', ')}.`, o);
        const [pick] = yield* g.chooseObj(c.p, `Mindsplitter: qual carta ${g.pname(o)} descarta?`, hand);
        if (pick) g.discardObjs(o, [pick]);
      },
    },
  ],
});
