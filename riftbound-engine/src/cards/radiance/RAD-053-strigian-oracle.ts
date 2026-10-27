import { registerCard } from '../../engine/script';

// Quando fico exaurida, Predict.
registerCard({
  code: 'RAD-053',
  triggers: [
    {
      on: 'exhaust',
      label: 'Predict',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        yield* c.g.predict(c.p, 1);
      },
    },
  ],
});
