import { registerCard } from '../../engine/script';

// Action: atordoe (Stun) uma unidade.
registerCard({
  code: 'OGN-050',
  keywords: { action: true },
  spell: {
    label: 'Rune Prison',
    targets: [{ prompt: 'Rune Prison: atordoar qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.stun(u, c.p);
    },
  },
});
