import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Assault 2. Quando você mata uma unidade com uma spell, você pode pagar [1][Fury] para me jogar do seu descarte.
registerCard({
  code: 'OGN-037',
  keywords: { assault: 2 },
  triggers: [
    {
      on: 'die',
      zone: 'trash',
      label: 'Unidade morta por spell: pagar 1 + Fury para jogar do descarte',
      optional: 'Pagar 1 + Fury para jogar Immortal Phoenix do descarte?',
      cost: E(1, 'Fury'),
      cond: (c, ev) =>
        !!ev.obj && c.g.isUnit(ev.obj) && !!ev.killedBy?.src && c.g.kind(ev.killedBy.src) === 'spell' && ev.killedBy.p === c.p,
      resolve: function* (c) {
        if (c.self.zone === 'trash') yield* c.g.playFromEffect(c.p, c.self, E(0));
      },
    },
  ],
});
