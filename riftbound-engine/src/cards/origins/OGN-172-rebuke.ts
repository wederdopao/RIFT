import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';
// Action: devolva uma unidade num campo de batalha para a mão do dono.
registerCard({
  code: 'OGN-172',
  keywords: { action: true },
  spell: {
    label: 'Rebuke',
    targets: [{ prompt: 'Rebuke: devolver qual unidade num campo para a mão do dono?', filter: (c, o) => atBf(c, o) }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.returnToHand(u);
    },
  },
});
