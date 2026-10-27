import { registerCard } from '../../engine/script';

// Hidden, Action: dê Shield 3 e Tank a uma unidade neste turno.
registerCard({
  code: 'OGN-057',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Block',
    targets: [{ prompt: 'Block: Shield 3 e Tank em qual unidade?' }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      c.g.giveKw(u, { shield: 3, tank: true });
      c.g.say(`${c.g.name(u)} ganha Shield 3 e Tank neste turno.`);
    },
  },
});
