import { registerCard } from '../../engine/script';
import { T } from '../helpers';

// Accelerate. Quando você me joga, dê +2 de Might a uma unidade neste turno.
registerCard({
  code: 'RAD-008',
  keywords: { accelerate: true },
  onPlay: [
    {
      label: '+2 de Might a uma unidade',
      targets: [T.anyUnit('War Scout: +2 de Might em qual unidade?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 2);
      },
    },
  ],
});
