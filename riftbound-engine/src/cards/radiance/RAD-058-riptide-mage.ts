import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Accelerate. Quando você me joga, dê a uma unidade inimiga -3 de Might neste turno.
registerCard({
  code: 'RAD-058',
  keywords: { accelerate: true },
  onPlay: [
    {
      label: '-3 de Might a uma unidade inimiga',
      targets: [T.enemyUnit('Riptide Mage: -3 de Might em qual unidade inimiga?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, -3);
      },
    },
  ],
});
