import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-147 Pride of Nazumah
registerCard({
  code: 'RAD-147',
  activated: [
    {
      label: '[1], exaurir: uma unidade aliada tem Assault igual ao seu Shield neste turno',
      exhaustSelf: true,
      cost: E(1),
      targets: [{ prompt: 'Pride of Nazumah: qual unidade sua?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u) return;
        const n = c.g.kw(u).shield || 0;
        if (n > 0) c.g.giveKw(u, { assault: n }, 'turn');
      },
    },
  ],
});
