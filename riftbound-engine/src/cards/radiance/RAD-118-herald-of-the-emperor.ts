import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-118',
  triggers: [
    {
      on: 'play',
      label: 'O Might base de uma unidade aliada vira 5 neste turno',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [T.friendlyUnit('Herald of the Emperor: o Might base de qual unidade aliada vira 5?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.addEffect({ target: u.id, player: c.p, until: 'turn', baseMight: 5 });
      },
    },
  ],
});
