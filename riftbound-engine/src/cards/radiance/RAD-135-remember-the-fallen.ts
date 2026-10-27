import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-135',
  spell: {
    label: 'Remember the Fallen',
    resolve: function* (c) {
      const g = c.g;
      for (let k = 0; k < 3; k++) {
        const cands = g.pl[c.p].trash.map((id) => g.objs[id]).filter((o) => o && (g.isUnit(o) || g.isGear(o)) && g.data(o).energy <= 3 && g.data(o).power <= 1);
        if (!cands.length) return;
        const [o] = yield* g.chooseObj(c.p, `Remember the Fallen: jogar qual carta do descarte? (${k + 1}/3, opcional)`, cands, 0, 1);
        if (!o) return;
        // "ignoring their costs": custo base [0]; custos adicionais continuam (356.1.b.1; ≠ "any and all costs", 356.5.a)
        yield* g.playFromEffect(c.p, o, NO_COST);
      }
    },
  },
});
