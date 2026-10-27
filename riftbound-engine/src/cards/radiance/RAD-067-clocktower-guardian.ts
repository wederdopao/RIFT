import { registerCard } from '../../engine/script';

// Quando você me joga ou eu seguro, Predict 3. Deathknell: bana o topo do deck; pode jogá-lo ignorando o custo de Energia.
registerCard({
  code: 'RAD-067',
  triggers: [
    {
      on: 'play',
      label: 'Predict 3',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.predict(c.p, 3);
      },
    },
    {
      on: 'hold',
      label: 'Predict 3',
      cond: (c, ev) => !!ev.units?.includes(c.self.id),
      resolve: function* (c) {
        yield* c.g.predict(c.p, 3);
      },
    },
    {
      on: 'die',
      zone: 'self',
      label: 'Deathknell: banir o topo do deck e poder jogá-lo ignorando o custo de Energia',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const s = g.pl[c.p];
        if (!s.mainDeck.length) return;
        const o = g.objs[s.mainDeck[0]];
        g.banishObj(o);
        if (yield* g.yesNo(c.p, `Jogar ${g.name(o)} ignorando o custo de Energia?`)) {
          yield* g.playFromEffect(c.p, o, { ...g.printedCost(o), energy: 0 });
        }
      },
    },
  ],
});
