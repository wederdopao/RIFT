import { registerCard } from '../../engine/script';

// Quando você me joga, dê [Ganking] a uma unidade neste turno (ela pode se mover de campo para campo).
registerCard({
  code: 'SFD-007',
  onPlay: [
    {
      label: 'Dar [Ganking] a uma unidade neste turno',
      targets: [{ prompt: 'Gem Jammer: dar [Ganking] a qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u || u.zone !== 'board') return;
        c.g.giveKw(u, { ganking: true });
        c.g.say(`${c.g.name(u)} recebe [Ganking] neste turno.`, c.p);
      },
    },
  ],
});
