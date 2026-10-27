import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';
// Quando você me joga, devolva outra unidade num campo de batalha para a mão do dono.
registerCard({
  code: 'OGN-188',
  onPlay: [
    {
      label: 'Devolver outra unidade num campo para a mão',
      targets: [
        {
          prompt: 'Zaunite Bouncer: devolver qual outra unidade num campo para a mão do dono?',
          filter: (c, o) => atBf(c, o) && o.id !== c.self.id,
        },
      ],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.returnToHand(u);
      },
    },
  ],
});
