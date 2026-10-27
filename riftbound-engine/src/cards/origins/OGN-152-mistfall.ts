import { registerCard } from '../../engine/script';
import { E } from '../helpers';
// Gear: quando você dá Buff a uma unidade aliada, pode pagar [Body] e exaurir este gear para prepará-la.
registerCard({
  code: 'OGN-152',
  triggers: [
    {
      on: 'buff',
      label: 'Pagar Body e exaurir para preparar a unidade',
      optional: 'Pagar 1 Body e exaurir Mistfall para preparar a unidade?',
      cond: (c, ev) => ev.player === c.p && ev.unit?.controller === c.p && !c.self.exhausted,
      cost: E(0, 'Body'),
      extraCost: function* (c) {
        if (c.self.exhausted || c.self.zone !== 'board') return false;
        c.self.exhausted = true;
        return true;
      },
      resolve: function* (c) {
        const u = c.ev!.unit;
        if (u.zone === 'board') {
          c.g.ready(u, c.p);
          c.g.say(`${c.g.name(u)} fica pronta (Mistfall).`);
        }
      },
    },
  ],
});
