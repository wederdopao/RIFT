import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-103',
  keywords: { hidden: true },
  asPlayed: showOff((g, o) => !!g.baseKeywords(o).hidden, 'Show Off uma carta com Hidden'),
  triggers: [
    {
      on: 'play',
      label: '[Add] [Rune] se mostrou',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      resolve: function* (c) { if (showedOff({ g: c.g, self: c.self, data: c.data })) c.g.addResources(c.p, 0, ['any']); },
    },
  ],
});
