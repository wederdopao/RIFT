import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-129',
  triggers: [
    {
      on: 'play',
      label: 'Olhar os 4 do topo: pegar uma unidade ou gear barato',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) {
        const g = c.g;
        const top = yield* g.revealTop(c.p, 4, c.p);
        const ok = top.filter((o) => (g.isUnit(o) || g.isGear(o)) && g.data(o).energy <= 3 && g.data(o).power <= 1);
        let take: Obj | undefined;
        if (ok.length) [take] = yield* g.chooseObj(c.p, 'Trifarian Captain: pegar qual carta? (opcional)', ok, 0, 1);
        if (take) g.toZone(take, 'hand');
        const rest = top.filter((o) => o !== take && o.zone === 'mainDeck');
        if (rest.length) yield* g.recycleCards(rest, { by: c.p });
      },
    },
  ],
});
