import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// VEN-147 Shen, Eye of Twilight
registerCard({
  code: 'VEN-147',
  activated: [
    {
      label: 'Exaurir: dar [Tank] a uma unidade aliada neste turno',
      timing: 'action',
      exhaustSelf: true,
      targets: [{ prompt: 'Shen: dar Tank a qual unidade sua?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveKw(u, { tank: true }, 'turn');
      },
    },
  ],
});
