import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Tomb-Raider Barbara
registerCard({
  code: 'VEN-037',
  onPlay: [
    {
      label: 'Gear inimigo: disempower ou matar (7+ runas)',
      prepare: function* (c) {
        return runes(c.g, c.p) >= 7;
      },
      targets: [{ prompt: 'Tomb-Raider Barbara: qual gear inimigo?', kind: 'gear', filter: (c, o) => o.controller !== c.p }],
      resolve: function* (c) {
        const o = c.targets[0][0];
        if (!o) return;
        if (o.empowered) c.g.disempower(o);
        else yield* c.g.killG(o);
      },
    },
  ],
});
