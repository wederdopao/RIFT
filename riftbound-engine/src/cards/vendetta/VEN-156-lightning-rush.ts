import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-156 Lightning Rush
registerCard({
  code: 'VEN-156',
  flow: E(2, 'any'),
  spell: {
    label: 'Lightning Rush',
    resolve: function* (c) {
      const g = c.g;
      const top = yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 3));
      if (!top.length) return;
      const picks = yield* g.chooseObj(c.p, 'Lightning Rush: comprar qual carta? (o resto vai para o descarte)', top.map((id) => g.objs[id]), 0, 1);
      const rest = top.filter((id) => !picks.some((p) => p.id === id));
      if (picks[0]) g.toZone(picks[0], 'hand');
      for (const id of rest) if (g.objs[id].zone === 'mainDeck') g.toZone(g.objs[id], 'trash');
    },
  },
});
