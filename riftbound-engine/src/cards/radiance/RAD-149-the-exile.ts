import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-149 The Exile
registerCard({
  code: 'RAD-149',
  auras: [
    {
      enterReady: (g, src, unit, loc) =>
        unit.controller === src.controller && loc?.t === 'bf' && g.bfs[loc.i]?.controller === src.controller,
    },
  ],
});
