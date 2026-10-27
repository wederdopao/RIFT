import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-114',
  triggers: [
    {
      on: 'exhaust',
      label: '+1 de Might neste turno',
      cond: (c, ev) => ev.obj?.id !== c.self.id && ev.obj?.controller === c.p && c.g.isUnit(ev.obj),
      resolve: function* (c) { if (c.self.zone === 'board') c.g.giveMight(c.self, 1); },
    },
  ],
  activated: [
    {
      label: 'Exaurir uma unidade aliada: preparar uma unidade (1x por turno)',
      condition: (g, self) => self.data?.rivenTurn !== g.turn,
      canPayExtra: (c) => c.g.units().some((u) => u.controller === c.p && !u.exhausted),
      extraCost: function* (c) {
        const g = c.g;
        const us = g.units().filter((u) => u.controller === c.p && !u.exhausted);
        if (!us.length) return false;
        const [u] = yield* g.chooseObj(c.p, 'Riven: exaurir qual unidade aliada?', us);
        if (!u) return false;
        c.self.data = { ...(c.self.data || {}), rivenTurn: g.turn };
        g.exhaust(u);
        return true;
      },
      targets: [T.anyUnit('Riven: preparar qual unidade?')],
      resolve: function* (c) { const u = c.targets[0][0]; if (u) c.g.ready(u, c.p); },
    },
  ],
});
