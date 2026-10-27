import { registerCard } from '../../engine/script';

// Mate um gear. O controlador dele compra 2.
// O gear é o alvo; o controlador não (regra 355.10.d). Se o alvo ficar ilegal, ninguém compra (359.3.e.5).
registerCard({
  code: 'SFD-005',
  spell: {
    label: 'Detonate',
    targets: [{ prompt: 'Detonate: matar qual gear?', kind: 'gear' }],
    resolve: function* (c) {
      const gear = c.targets[0][0];
      if (!gear || gear.zone !== 'board') return;
      const ctrl = gear.controller;
      yield* c.g.killG(gear, 'explode');
      yield* c.g.draw(ctrl, 2);
    },
  },
});
