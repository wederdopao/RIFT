import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

registerCard({
  code: 'VEN-088',
  triggers: [
    {
      on: 'ready',
      label: 'Jayce: escolher Assault 2, Deflect 2 ou Ganking neste turno',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      prepare: function* (c) {
        const [m] = yield* c.g.ask(c.p, 'choose', 'Jayce: dar qual palavra-chave neste turno?', [
          { id: 'assault', label: 'Assault 2' },
          { id: 'deflect', label: 'Deflect 2' },
          { id: 'ganking', label: 'Ganking' },
        ]);
        c.data.mode = m;
        return true;
      },
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        const m = c.data.mode;
        if (m === 'assault') c.g.giveKw(c.self, { assault: 2 });
        else if (m === 'deflect') c.g.giveKw(c.self, { deflect: 2 });
        else c.g.giveKw(c.self, { ganking: true });
      },
    },
  ],
});
