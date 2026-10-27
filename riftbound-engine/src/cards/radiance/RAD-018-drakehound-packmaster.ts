import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import type { P } from '../../engine/types';

// Quando você me joga, revele o topo do deck de cada oponente. Escolha uma, bana-a e jogue-a ignorando o custo. Recicle o resto.
registerCard({
  code: 'RAD-018',
  onPlay: [
    {
      label: 'Revelar o topo do deck do oponente e jogar',
      resolve: function* (c) {
        const g = c.g;
        const q = (1 - c.p) as P;
        if (!g.pl[q].mainDeck.length) return;
        const revealed = yield* g.revealTop(q, 1, c.p);
        if (!revealed.length) return;
        const [pick] = yield* g.chooseObj(c.p, 'Drakehound Packmaster: qual carta banir e jogar ignorando o custo?', revealed);
        g.banishObj(pick);
        yield* g.playFromEffect(c.p, pick, E(0));
        for (const o of revealed) if (o !== pick && o.zone === 'mainDeck') g.recycleCard(o);
      },
    },
  ],
});
