import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-124',
  spell: {
    label: 'Burn Away',
    // o Burn 2 não depende do alvo: acontece mesmo se o alvo ficou ilegal (359.3.e.6-7, 359.3.e.10)
    alwaysResolve: true,
    targets: [{ prompt: 'Burn Away: banir qual unidade (3 de Might ou menos) ou gear?', kind: 'permanent', filter: (c, o) => c.g.isGear(o) || (c.g.isUnit(o) && c.g.might(o) <= 3) }],
    resolve: function* (c) {
      const o = c.targets[0][0];
      if (o && o.zone === 'board') c.g.banishObj(o);
      c.g.burn(c.p, 2);
    },
  },
});
