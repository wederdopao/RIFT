import { registerCard } from '../../engine/script';

// Vault Breaker. Action. Dê [Assault 2] e [Ganking] a uma unidade neste turno.
registerCard({
  code: 'UNL-010',
  keywords: { action: true },
  spell: {
    label: 'Vault Breaker',
    targets: [{ prompt: 'Vault Breaker: dar [Assault 2] e [Ganking] a qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u || u.zone !== 'board') return;
      c.g.giveKw(u, { assault: 2, ganking: true });
      c.g.say(`${c.g.name(u)} recebe [Assault 2] e [Ganking] neste turno.`, c.p);
    },
  },
});
