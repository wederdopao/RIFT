import { registerCard } from '../../engine/script';

// Quando você me joga, compre 1 para cada unidade Mighty sua (5+ de Might).
registerCard({
  code: 'OGN-038',
  onPlay: [
    {
      label: 'Comprar 1 por unidade Mighty sua',
      resolve: function* (c) {
        const n = c.g.units().filter((u) => u.controller === c.p && c.g.isMighty(u)).length;
        if (n) yield* c.g.draw(c.p, n);
      },
    },
  ],
});
