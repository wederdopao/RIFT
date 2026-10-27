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
      // "you may kill a friendly gear to give me ...": matar o gear é custo dentro da instrução (355.10.c.1), pago ao
      // finalizar o gatilho como custo base dele (383.3.b) — não é alvo, e o +2 vale mesmo que o gear saia antes.
      on: 'defend',
      label: 'Matar um gear aliado para +2 de Might',
      optional: 'Matar um gear aliado para ganhar +2 de Might neste turno?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      canPayExtra: (c) => c.g.board().some((o) => c.g.isGear(o) && o.controller === c.p),
      extraCost: function* (c) {
        const gs = c.g.board().filter((o) => c.g.isGear(o) && o.controller === c.p);
        if (!gs.length) return false;
        const [o] = yield* c.g.chooseObj(c.p, 'Ziggs: matar qual gear aliado?', gs);
        if (!o) return false;
        yield* c.g.killG(o);
        return true;
      },
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 2);
      },
    },
  ],
});
