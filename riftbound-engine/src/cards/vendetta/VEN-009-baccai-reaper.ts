import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Baccai Reaper
registerCard({
  code: 'VEN-009',
  triggers: [
    {
      on: 'attack',
      label: 'Pagar Fury: Assault 2',
      optional: 'Pagar [Fury] para ganhar Assault 2 neste turno?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      cost: E(0, 'Fury'),
      resolve: function* (c) {
        c.g.giveKw(c.self, { assault: 2 });
      },
    },
  ],
});
