import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';
// Reaction: devolva para a mão do dono uma unidade num campo com 3 ou menos de Might.
registerCard({
  code: 'OGN-169',
  keywords: { reaction: true },
  spell: {
    label: 'Gust',
    targets: [
      { prompt: 'Gust: unidade num campo com 3 ou menos de Might', filter: (c, o) => atBf(c, o) && c.g.might(o) <= 3 },
    ],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.returnToHand(u);
    },
  },
});
