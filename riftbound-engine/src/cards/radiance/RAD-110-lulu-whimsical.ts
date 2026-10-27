import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-110',
  triggers: [
    {
      on: 'move',
      label: 'O Might base de outra unidade vira 4 neste turno',
      optional: 'Fazer o Might base de outra unidade virar 4 neste turno?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [{ prompt: "Lulu, Whimsical: o Might base de qual outra unidade vira 4?", filter: (c, o) => o.id !== c.self.id }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.addEffect({ target: u.id, player: c.p, until: 'turn', baseMight: 4 });
      },
    },
  ],
});
