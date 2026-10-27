import { registerCard } from '../../engine/script';
// Reaction. Escolha um campo de batalha. Unidades aliadas lá recebem +1 de Might neste turno e unidades inimigas
// lá recebem -1 de Might neste turno (até um mínimo de 1).
registerCard({
  code: 'OGN-266',
  keywords: { reaction: true },
  spell: {
    label: 'Siphon Power',
    targets: [{ prompt: 'Siphon Power: qual campo de batalha?', kind: 'battlefield' }],
    resolve: function* (c) {
      const g = c.g;
      const bf = c.targets[0][0];
      if (!bf) return;
      for (const u of g.unitsAtBf(g.bfOf(bf))) {
        if (u.controller === c.p) g.giveMight(u, 1);
        else g.giveMight(u, -1, 'turn', 1);
      }
    },
  },
});
