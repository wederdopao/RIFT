import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-132',
  asPlayed: function* (c) {
    const name = yield* c.g.nameCardG(c.p, 'Fallen Feline: nomeie uma spell', (d) => d.type.toLowerCase().includes('spell'));
    c.data.named = name;
    c.self.data = { ...(c.self.data || {}), named: name };
    return true;
  },
  auras: [
    {
      blockPlay: (g, src, card, p) =>
        src.zone === 'board' && g.bfIndex(src) >= 0 && p !== src.controller && g.kind(card) === 'spell' && !!src.data?.named && g.data(card).name === src.data.named,
    },
  ],
});
