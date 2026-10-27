import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-095',
  keywords: { hidden: true },
  kwMod: (g, self) => (self.data?.tmpV === self.zoneVersion ? { temporary: true } : undefined),
  triggers: [
    {
      on: 'play',
      label: 'Receber Temporary (jogada fora do seu turno)',
      cond: (c, ev) => ev.obj?.id === c.self.id && c.g.active !== c.p,
      resolve: function* (c) { c.self.data = { ...(c.self.data || {}), tmpV: c.self.zoneVersion }; },
    },
  ],
});
