import { registerCard } from '../../engine/script';

// [Deathknell] [Predict 2]: olhe as 2 cartas do topo do seu Main Deck, recicle quantas quiser e devolva o resto ao topo
// na ordem que quiser (436.1.a). Com menos cartas no deck, prediz as que houver, sem Burn Out (436.4).
registerCard({
  code: 'UNL-062',
  triggers: [
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: Predict 2',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.predict(c.p, 2);
      },
    },
  ],
});
