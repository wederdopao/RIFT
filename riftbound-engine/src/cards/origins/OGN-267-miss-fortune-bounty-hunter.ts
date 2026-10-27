import { registerCard } from '../../engine/script';
// Lenda: [Tap]: dê Ganking a uma unidade neste turno.
registerCard({
  code: 'OGN-267',
  activated: [
    {
      label: 'Exaurir: dar Ganking a uma unidade neste turno',
      exhaustSelf: true,
      targets: [{ prompt: 'Miss Fortune: dar Ganking a qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) {
          c.g.giveKw(u, { ganking: true });
          c.g.say(`${c.g.name(u)} ganha Ganking neste turno.`, c.p);
        }
      },
    },
  ],
});
