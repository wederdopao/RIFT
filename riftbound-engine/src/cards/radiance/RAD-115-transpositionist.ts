import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-115',
  activated: [
    {
      label: 'Devolver uma unidade aliada; jogar uma unidade com menos Might',
      cost: E(0, 'Chaos'),
      exhaustSelf: true,
      targets: [T.friendlyUnit('Transpositionist: devolver qual unidade aliada para a mão?')],
      resolve: function* (c) {
        const g = c.g;
        const u = c.targets[0][0];
        if (!u || u.zone !== 'board') return;
        const m = g.might(u);
        g.returnToHand(u);
        const cands = g.pl[c.p].hand.map((id) => g.objs[id]).filter((o) => o && g.isUnit(o) && g.data(o).might < m);
        if (!cands.length || !(yield* g.yesNo(c.p, 'Jogar uma unidade com menos Might, ignorando o custo?'))) return;
        const [card] = yield* g.chooseObj(c.p, 'Transpositionist: jogar qual unidade?', cands);
        if (card) yield* g.playFromEffect(c.p, card, NO_COST, undefined, { allFree: true });
      },
    },
  ],
});
