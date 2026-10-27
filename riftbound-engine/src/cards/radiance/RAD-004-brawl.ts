import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Action. Dê a uma unidade Assault neste turno igual ao Might dela.
registerCard({
  code: 'RAD-004',
  keywords: { action: true },
  spell: {
    label: 'Brawl',
    targets: [T.anyUnit('Brawl: Assault igual ao Might de qual unidade?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveKw(u, { assault: Math.max(0, c.g.might(u)) });
    },
  },
});
