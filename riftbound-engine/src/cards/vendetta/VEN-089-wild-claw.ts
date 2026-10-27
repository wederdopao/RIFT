import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-089',
  spell: {
    label: 'Wild Claw',
    resolve: function* (c) {
      const g = c.g;
      const top = yield* g.lookAtTop(c.p, g.pl[c.p].mainDeck.slice(0, 5));
      const objs = top.map((id) => g.objs[id]);
      const cands = objs.filter((o) => g.isUnit(o) || g.isGear(o));
      let played: Obj | undefined;
      if (cands.length) {
        const [pick] = yield* g.chooseObj(c.p, 'Wild Claw: banir e jogar qual unidade/gear (custo -5)?', cands, 0, 1);
        if (pick) {
          g.banishObj(pick);
          yield* g.playFromEffect(c.p, pick, g.printedCost(pick), undefined, { discount: 5 });
          if (pick.zone === 'board') played = pick;
        }
      }
      const rest = objs.filter((o) => o !== played && o.zone === 'mainDeck');
      if (rest.length) yield* g.recycleCards(rest, { by: c.p });
      if (played && played.zone === 'board' && !played.empowered && (yield* g.yesNo(c.p, `Wild Claw: empower ${g.name(played)}?`)))
        g.empowerObj(played, c.p);
    },
  },
});
