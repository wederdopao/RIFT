import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-136',
  keywords: { deploy: true },
  triggers: [
    {
      on: 'play',
      label: 'Banir uma unidade aqui',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [{ prompt: 'Dockside Lock-Up: banir qual unidade aqui?', filter: (c, o) => c.g.bfIndex(o) >= 0 && c.g.bfIndex(o) === c.g.bfIndex(c.self) }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (!u || u.zone !== 'board') return;
        const isCard = !u.token;
        c.g.banishObj(u);
        c.self.data = { ...(c.self.data || {}), banished: isCard ? u.id : undefined, banV: c.self.zoneVersion };
      },
    },
    {
      on: 'hold',
      label: 'Matar-me para jogar a carta banida, ignorando o custo',
      cond: (c, ev) => ev.player === c.p && ev.bf === c.g.bfIndex(c.self) && !!c.self.data?.banished,
      resolve: function* (c) {
        const g = c.g;
        const id = c.self.data?.banished as string | undefined;
        const card = id ? g.objs[id] : undefined;
        if (!card || card.zone !== 'banish') return;
        if (!(yield* g.yesNo(c.p, 'Matar Dockside Lock-Up para jogar a carta banida, ignorando o custo?'))) return;
        yield* g.killG(c.self);
        yield* g.playFromEffect(c.p, card, NO_COST, undefined, { allFree: true });
      },
    },
  ],
});
