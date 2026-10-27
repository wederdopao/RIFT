import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Quando você me descarta, você pode pagar [Fury] para me jogar.
registerCard({
  code: 'OGN-006',
  triggers: [
    {
      on: 'discard',
      zone: 'trash',
      label: 'Pagar Fury para jogar do descarte',
      optional: 'Pagar 1 Fury para jogar Flame Chompers?',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      cost: E(0, 'Fury'),
      resolve: function* (c) {
        if (c.self.zone === 'trash') yield* c.g.playFromEffect(c.p, c.self, E(0));
      },
    },
  ],
});
