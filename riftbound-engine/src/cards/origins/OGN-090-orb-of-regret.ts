import { registerCard } from '../../engine/script';

// Exaurir: dê -1 de Might a uma unidade neste turno, até um mínimo de 1.
registerCard({
  code: 'OGN-090',
  activated: [
    {
      label: 'Exaurir: -1 de Might numa unidade (mínimo 1)',
      exhaustSelf: true,
      targets: [{ prompt: 'Orb of Regret: -1 de Might em qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, -1, 'turn', 1);
      },
    },
  ],
});
