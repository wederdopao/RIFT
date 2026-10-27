import { registerCard } from '../../engine/script';
import { E, T, playBomb, showOff, showedOff, chooseDestination, chooseTokenLoc } from '../helpers';
import { NO_COST } from '../../engine/types';
import type { Obj } from '../../engine/types';

registerCard({
  code: 'RAD-107',
  keywords: { hidden: true },
  triggers: [
    {
      on: 'play',
      label: 'Escolher um campo; com 4+ unidades, devolver uma unidade inimiga',
      cond: (c, ev) => ev.obj?.id === c.self.id,
      targets: [{ prompt: 'Bedeviling Stranger: escolha um campo de batalha', kind: 'battlefield' }],
      resolve: function* (c) {
        const g = c.g;
        const b = c.targets[0][0];
        const i = b ? g.bfOf(b) : -1;
        if (i < 0 || g.unitsAtBf(i).length < 4) return;
        const enemies = g.unitsAtBf(i).filter((u) => u.controller !== c.p);
        if (!enemies.length || !(yield* g.yesNo(c.p, 'Devolver uma unidade inimiga aqui para a mão do dono?'))) return;
        const [u] = yield* g.chooseObj(c.p, 'Bedeviling Stranger: devolver qual unidade inimiga?', enemies);
        if (u) g.returnToHand(u);
      },
    },
  ],
});
