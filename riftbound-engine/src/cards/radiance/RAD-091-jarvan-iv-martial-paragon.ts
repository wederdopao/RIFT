import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-091',
  auras: [
    {
      keywordsAnywhere: (g, src, card) => (g.kind(card) === 'gear' && card.controller === src.controller && !!g.baseKeywords(card).deploy ? { action: true } : undefined),
    },
  ],
  triggers: [
    {
      on: 'conquer',
      label: 'Canalizar 1 runa exaurida',
      cond: (c, ev) => {
        if (ev.player !== c.p || !(ev.units || []).includes(c.self.id)) return false;
        const g = c.g;
        const i = g.bfIndex(c.self);
        return i >= 0 && g.board().some((o) => g.isGear(o) && o.controller === c.p && g.bfIndex(o) === i && !!g.baseKeywords(o).deploy);
      },
      resolve: function* (c) { c.g.channel(c.p, 1, true); },
    },
  ],
});
