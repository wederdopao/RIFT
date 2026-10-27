import { registerCard } from '../../engine/script';

// Quando você me joga, Predict 2. Disarm 2.
registerCard({
  code: 'RAD-050',
  keywords: { disarm: 2 },
  onPlay: [{ label: 'Predict 2', resolve: function* (c) { yield* c.g.predict(c.p, 2); } }],
});
