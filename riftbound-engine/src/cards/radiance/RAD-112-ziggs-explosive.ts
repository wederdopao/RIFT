import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-112',
  activated: [
    {
      label: 'Jogar uma Bomb',
      cost: E(1),
      exhaustSelf: true,
      resolve: function* (c) { yield* playBomb(c); },
    },
  ],
  triggers: [
    {
      on: 'defend',
      label: 'Matar um gear aliado para +2 de Might',
      optional: 'Matar um gear aliado para ganhar +2 de Might neste turno?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      targets: [{ prompt: 'Ziggs: matar qual gear aliado?', kind: 'gear', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const o = c.targets[0][0];
        if (!o || o.zone !== 'board') return;
        yield* c.g.killG(o);
        c.g.giveMight(c.self, 2);
      },
    },
  ],
});
