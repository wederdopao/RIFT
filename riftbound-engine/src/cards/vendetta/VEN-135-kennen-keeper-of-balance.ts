import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

const kennenStun = {
  label: 'Kennen: pagar [2] para dar Stun numa unidade',
  optional: 'Kennen: pagar [2] para dar Stun numa unidade?',
  cost: E(2),
  targets: [T.anyUnit('Kennen: Stun em qual unidade?')],
  resolve: function* (c: any) {
    const t = c.targets[0][0];
    if (t) c.g.stun(t, c.p);
  },
};
registerCard({
  code: 'VEN-135',
  keywords: { hidden: true },
  mightMod: (g, self) => {
    const i = g.bfIndex(self);
    return i >= 0 && g.unitsAtBf(i).some((u) => u.controller !== self.controller && u.stunned) ? 2 : 0;
  },
  onPlay: [kennenStun],
  triggers: [
    {
      ...kennenStun,
      on: 'attack',
      cond: (c, ev) => ev.unit?.id === c.self.id && !ev.playerLevel,
    },
  ],
});
