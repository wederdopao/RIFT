import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-164 Packed Amphitheater
registerCard({
  code: 'RAD-164',
  auras: [
    {
      might: (g, src, t) =>
        g.isUnit(t) && g.bfIndex(t) >= 0 && g.bfIndex(t) === g.bfOf(src) && g.data(t).type.includes('Champion') ? 1 : 0,
    },
  ],
});
