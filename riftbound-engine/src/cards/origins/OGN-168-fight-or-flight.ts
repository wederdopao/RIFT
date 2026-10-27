import { registerCard } from '../../engine/script';
import { atBf } from '../helpers';
// (BANIDO no padrão) Hidden, Action: mova uma unidade de um campo para a base dela.
registerCard({
  code: 'OGN-168',
  keywords: { hidden: true, action: true },
  spell: {
    label: 'Fight or Flight',
    targets: [{ prompt: 'Fight or Flight: unidade num campo', filter: (c, o) => atBf(c, o) }],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.moveUnits([u], { t: 'base', p: u.controller }, c.p);
    },
  },
});
