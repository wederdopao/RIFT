import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Nasus, Guardian of Knowledge
registerCard({
  code: 'VEN-063',
  triggers: [
    {
      on: 'die',
      label: 'Canalizar 1 runa exaurida (uma vez por turno)',
      cond: (c, ev) => {
        const g = c.g;
        const i = g.bfIndex(c.self);
        return i >= 0 && ev.loc?.t === 'bf' && ev.loc.i === i && ev.controller !== c.p && !!ev.obj && g.isUnit(ev.obj) && c.self.data?.nasusTurn !== g.turn;
      },
      resolve: function* (c) {
        if (c.self.data?.nasusTurn === c.g.turn) return;
        c.self.data = { ...(c.self.data || {}), nasusTurn: c.g.turn };
        c.g.channel(c.p, 1, true);
      },
    },
  ],
});
