import { registerCard } from '../../engine/script';

// Unidade 3. Quando você me joga, descarte 1, depois compre 1.
// - A compra não depende do descarte (não é instrução ligada, regra 205): com a mão vazia, só compra.
registerCard({
  code: 'UNL-123',
  onPlay: [
    {
      label: 'Descartar 1, depois comprar 1',
      resolve: function* (c) {
        yield* c.g.discard(c.p, 1, 'Evershade Stalker: escolha a carta para descartar');
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
