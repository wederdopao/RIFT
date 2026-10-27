import { registerCard } from '../../engine/script';

// Reaction. Descarte 1, depois compre 2.
// - A compra não depende do descarte: com a mão vazia, só compra 2.
registerCard({
  code: 'UNL-125',
  keywords: { reaction: true },
  spell: {
    label: 'Lunar Boon',
    resolve: function* (c) {
      yield* c.g.discard(c.p, 1, 'Lunar Boon: escolha a carta para descartar');
      yield* c.g.draw(c.p, 2);
    },
  },
});
