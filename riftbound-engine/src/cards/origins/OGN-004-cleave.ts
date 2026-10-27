import { registerCard } from '../../engine/script';

// Action: dê Assault 3 a uma unidade neste turno.
registerCard({
  code: 'OGN-004',
  keywords: { action: true },
  spell: {
    label: 'Cleave',
    targets: [{ prompt: 'Cleave: dar Assault 3 a qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      c.g.giveKw(u, { assault: 3 });
      c.g.say(`${c.g.name(u)} ganha Assault 3 neste turno.`);
    },
  },
});
