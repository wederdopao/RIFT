import { registerCard } from '../../engine/script';

// Quando você me joga, cause 1 de dano a cada uma de até 2 unidades.
registerCard({
  code: 'RAD-003',
  onPlay: [
    {
      label: '1 de dano a até 2 unidades',
      targets: [{ prompt: 'Bilgewater Tracker: 1 de dano em até 2 unidades', min: 0, max: 2 }],
      resolve: function* (c) {
        for (const u of c.targets[0] || []) c.g.dealDamage(u, 1, c.self);
      },
    },
  ],
});
