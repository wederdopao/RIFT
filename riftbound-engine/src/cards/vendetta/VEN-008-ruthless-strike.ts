import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Ruthless Strike
registerCard({
  code: 'VEN-008',
  keywords: { action: true },
  optionalCosts: [
    {
      label: 'Descartar 1 como custo adicional (5 de dano em vez de 3)?',
      flag: 'discarded',
      canPay: (g, self, p) => g.pl[p].hand.some((id) => id !== self.id),
      pay: function* (c) {
        const d = yield* c.g.discard(c.p, 1, 'Ruthless Strike: descarte 1');
        return d.length > 0;
      },
    },
  ],
  spell: {
    label: 'Ruthless Strike',
    targets: [T.unitAtBf('Ruthless Strike: dano em qual unidade num campo de batalha?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.dealDamage(u, c.data.discarded ? 5 : 3, c.self);
    },
  },
});
