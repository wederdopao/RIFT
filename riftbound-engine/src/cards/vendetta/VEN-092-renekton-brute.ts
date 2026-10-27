import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// VEN-092 Renekton, Brute
// "When my Might becomes 10 or more, empower me." — evento genérico 'mightReach' com threshold 10 (como o 'mighty' do
// 5: passa de menos de 10 para 10 ou mais no tabuleiro).
registerCard({
  code: 'VEN-092',
  kwMod: (g, self) => (self.empowered ? { deflect: 1, ganking: true } : undefined),
  activated: [
    {
      label: '+1 Might neste turno',
      cost: E(1),
      resolve: function* (c) {
        c.g.giveMight(c.self, 1);
      },
    },
  ],
  triggers: [
    {
      on: 'mightReach',
      threshold: 10,
      label: 'Renekton: Might 10 ou mais, empower',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.empowerObj(c.self, c.p);
      },
    },
  ],
});
