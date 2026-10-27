import { registerCard } from '../../engine/script';
import { E, T, atBf, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj, P } from '../../engine/types';
import { empowerAct, hasDomain } from './_bh';

// Quando eu fico Empowered, você pode escolher uma unidade no seu descarte com Energy até 3 e Power até [Rune]; jogue-a na sua
// base, ignorando o custo. A unidade é um alvo escolhido ao finalizar o gatilho.
registerCard({
  code: 'VEN-104',
  empower: E(2, 'Chaos'),
  triggers: [
    {
      on: 'empower',
      label: 'Tail-Cloaked Matriarch: jogar unidade do descarte',
      optional: 'Tail-Cloaked Matriarch: jogar uma unidade do seu descarte (Energy <= 3, Power <= 1)?',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [
        {
          prompt: 'Tail-Cloaked Matriarch: jogar qual unidade do seu descarte?',
          kind: 'trash',
          filter: (c, o) => o.owner === c.p && c.g.isUnit(o) && c.g.data(o).energy <= 3 && c.g.data(o).power <= 1,
        },
      ],
      resolve: function* (c) {
        const pick = c.targets[0]?.[0];
        if (pick && pick.zone === 'trash') yield* c.g.playFromEffect(c.p, pick, NO_COST, { t: 'base', p: c.p });
      },
    },
  ],
});
