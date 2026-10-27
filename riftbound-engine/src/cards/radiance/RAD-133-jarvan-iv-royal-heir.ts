import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-133',
  keywords: { assault: 1, tank: true },
  triggers: [
    {
      on: 'attack',
      label: 'Mover uma unidade sua para o meu campo',
      optional: 'Mover uma unidade sua para o campo desta unidade?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [{ prompt: 'Jarvan IV: mover qual unidade sua para este campo?', filter: (c, o) => o.controller === c.p && o.id !== c.self.id && c.g.bfIndex(c.self) >= 0 && !c.g.locEq(c.g.locOf(o), c.g.locOf(c.self)) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        const i = c.g.bfIndex(c.self);
        if (u && u.zone === 'board' && i >= 0) c.g.moveUnits([u], { t: 'bf', i }, c.p);
      },
    },
  ],
});
