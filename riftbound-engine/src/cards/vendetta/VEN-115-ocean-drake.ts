import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-115',
  playToOpen: true,
  onPlay: [
    {
      label: 'Ocean Drake: devolver uma unidade não-Dragon à mão',
      optional: 'Ocean Drake: devolver uma unidade não-Dragon à mão do dono?',
      targets: [{ prompt: 'Ocean Drake: devolver qual unidade não-Dragon?', filter: (c, o) => !c.g.hasTag(o, 'Dragon') }],
      resolve: function* (c) {
        const t = c.targets[0][0];
        if (t) c.g.returnToHand(t);
      },
    },
  ],
});
