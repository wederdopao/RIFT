import { registerCard } from '../../engine/script';
// Cause 3 a todas as unidades inimigas num campo de batalha.
registerCard({
  code: 'OGS-002',
  spell: {
    label: 'Firestorm',
    targets: [{ prompt: 'Firestorm: 3 de dano nas unidades inimigas de qual campo?', kind: 'battlefield' }],
    resolve: function* (c) {
      const bf = c.targets[0][0];
      if (!bf) return;
      const i = c.g.bfOf(bf);
      for (const u of c.g.unitsAtBf(i).filter((x) => x.controller !== c.p)) c.g.dealDamage(u, 3, c.self);
    },
  },
});
