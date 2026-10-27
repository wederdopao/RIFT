import { registerCard } from '../../engine/script';

// Quando você me joga, atordoe (Stun) uma unidade.
registerCard({
  code: 'OGN-051',
  onPlay: [
    {
      label: 'Atordoar uma unidade',
      targets: [{ prompt: 'Solari Shieldbearer: atordoar qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.stun(u, c.p);
      },
    },
  ],
});
