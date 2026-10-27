import { registerCard } from '../../engine/script';

// Gear. [Reaction]. [Temporary]. Quando um oponente pontua (conquista ou hold), compre 1.
// Pontuar conta mesmo quando o último ponto por conquista vira compra (471.1.b.1: o campo foi pontuado). O evento extra
// do Skyfall of Areion (aliasOf) é a mesma pontuação e não conta de novo.
registerCard({
  code: 'UNL-085',
  keywords: { reaction: true, temporary: true },
  triggers: [
    {
      on: ['conquer', 'hold'],
      label: 'Oponente pontuou: comprar 1',
      cond: (c, ev) => ev.player !== undefined && ev.player !== c.p && !ev.aliasOf,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
