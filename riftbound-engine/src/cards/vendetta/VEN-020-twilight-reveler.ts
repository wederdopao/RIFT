import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Twilight Reveler
registerCard({
  code: 'VEN-020',
  triggers: [
    {
      on: 'attack',
      label: 'Preparar outra unidade aliada',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [T.friendlyUnit('Twilight Reveler: preparar qual outra unidade sua?', true)],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.ready(u, c.p);
      },
    },
  ],
});
