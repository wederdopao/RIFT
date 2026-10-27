import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-076',
  triggers: [
    {
      on: 'conquer',
      label: '[Add] [Rune]',
      immediate: true,
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) { c.g.addResources(c.p, 0, ['any']); },
    },
  ],
});
