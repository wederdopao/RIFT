import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-073',
  keywords: { deploy: true },
  triggers: [
    {
      on: 'play',
      label: 'Buff em uma unidade aliada',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [T.friendlyUnit('Pillaged Armory: Buff em qual unidade aliada?')],
      resolve: function* (c) { const u = c.targets[0][0]; if (u) c.g.buff(u, c.p); },
    },
    {
      on: 'conquer',
      label: 'Buff em uma unidade aliada',
      cond: (c, ev) => ev.player === c.p && ev.bf === c.g.bfIndex(c.self),
      targets: [T.friendlyUnit('Pillaged Armory: Buff em qual unidade aliada?')],
      resolve: function* (c) { const u = c.targets[0][0]; if (u) c.g.buff(u, c.p); },
    },
  ],
});
