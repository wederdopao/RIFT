import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

function* relicBurn(c: any) {
  const g = c.g;
  const s = g.pl[c.p];
  const empty = !s.mainDeck.length;
  const top0 = empty ? undefined : g.objs[s.mainDeck[0]];
  g.burn(c.p, 1);
  // deck vazio: o Burn Out recicla o descarte e a carta queimada é a do topo do deck novo, a única no descarte (431.2)
  const top = empty ? (s.trash.length === 1 ? g.objs[s.trash[0]] : undefined) : top0;
  if (top && g.isUnit(top) && top.zone === 'trash') {
    const m = g.data(top).might;
    const [u] = yield* g.chooseObj(c.p, 'Forgotten Relic: +Might em qual unidade aliada?', g.units().filter((x: Obj) => x.controller === c.p), 1, 1);
    if (u) g.giveMight(u, m);
  }
}
registerCard({
  code: 'VEN-108',
  onPlay: [{ label: 'Forgotten Relic: Burn 1', resolve: relicBurn }],
  triggers: [
    {
      on: 'beginStart',
      label: 'Forgotten Relic: Burn 1',
      cond: (c, ev) => ev.player === c.p,
      resolve: relicBurn,
    },
  ],
});
