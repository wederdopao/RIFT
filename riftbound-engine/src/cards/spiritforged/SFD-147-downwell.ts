import { registerCard } from '../../engine/script';

// Devolva todas as unidades e gear para a mão dos donos. Cartas escondidas não são unidades nem gear e ficam
// (FAQ riftjudge #8592); fichas (Gold) saem do jogo ao irem para a mão (FAQ #8699).
registerCard({
  code: 'SFD-147',
  spell: {
    label: 'Downwell',
    resolve: function* (c) {
      const g = c.g;
      const all = g.board().filter((o) => g.isUnit(o) || g.isGear(o));
      for (const o of all) if (o.zone === 'board') g.returnToHand(o);
    },
  },
});
