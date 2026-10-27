import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-101',
  optionalCosts: [{ label: 'Pagar [1] a mais (Assault 2 numa unidade)?', cost: E(1), flag: 'paid' }],
  triggers: [
    {
      on: 'play',
      label: 'Gust Monk: banir uma carta de um descarte para dar Assault 2',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.data?.paid,
      targets: [T.anyUnit('Gust Monk: Assault 2 em qual unidade?')],
      resolve: function* (c) {
        const g = c.g;
        const u = c.targets[0][0];
        const cards = [...g.pl[0].trash, ...g.pl[1].trash].map((id) => g.objs[id]);
        if (!u || !cards.length) return;
        const [pick] = yield* g.chooseObj(c.p, 'Gust Monk: banir qual carta de um descarte?', cards);
        if (!pick) return;
        g.banishObj(pick);
        g.giveKw(u, { assault: 2 });
      },
    },
  ],
});
