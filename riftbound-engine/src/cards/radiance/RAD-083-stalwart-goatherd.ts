import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-083',
  keywords: { shield: 2 },
  triggers: [
    {
      on: 'play',
      label: 'Matar um gear com custo de Energy 4 ou menos',
      optional: 'Matar um gear com custo de Energy 4 ou menos?',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [{ prompt: 'Stalwart Goatherd: matar qual gear (Energy 4 ou menos)?', kind: 'gear', filter: (c, o) => c.g.data(o).energy <= 4 }],
      resolve: function* (c) { const o = c.targets[0][0]; if (o && o.zone === 'board') yield* c.g.killG(o); },
    },
  ],
});
