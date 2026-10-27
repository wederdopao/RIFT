import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Punching Poro
registerCard({
  code: 'VEN-007',
  mightMod: (g, self) => (self.empowered ? 1 : 0),
  empower: {
    extra: {
      label: 'Discard 1',
      canPay: (c) => c.g.pl[c.p].hand.length > 0,
      pay: function* (c) {
        const d = yield* c.g.discard(c.p, 1, 'Punching Poro: descarte 1 para Empower');
        return d.length > 0;
      },
    },
  },
});
