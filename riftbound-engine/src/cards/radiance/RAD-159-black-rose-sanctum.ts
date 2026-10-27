import { registerCard } from '../../engine/script';
import { E } from '../helpers';
import { exhaustMe, disempowerMe, moveFriendlyUnit, chooseBf } from '../vendetta/leg-helpers';
// RAD-159 Black Rose Sanctum
registerCard({
  code: 'RAD-159',
  triggers: [
    {
      on: 'die',
      label: 'Jogar uma Recruit de 1 Might na base',
      controller: (_g, _src, ev) => (ev.controller === 0 || ev.controller === 1 ? ev.controller : null),
      cond: (c, ev) => {
        const i = c.g.bfOf(c.self);
        if (i < 0 || ev.loc?.t !== 'bf' || ev.loc.i !== i || !ev.obj || ev.obj.token || !c.g.isUnit(ev.obj)) return false;
        const d = (c.self.data ||= {});
        if (d.sanctumTurn !== c.g.turn) d.sanctum = [];
        d.sanctumTurn = c.g.turn;
        if (d.sanctum.includes(ev.controller)) return false;
        d.sanctum.push(ev.controller);
        return true;
      },
      resolve: function* (c) {
        yield* c.g.playTokenG('TOK-RECRUIT', c.p, { t: 'base', p: c.p });
      },
    },
  ],
});
