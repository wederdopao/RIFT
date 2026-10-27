import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Mesmerize
registerCard({
  code: 'VEN-052',
  keywords: { reaction: true },
  spell: {
    label: 'Mesmerize',
    prepare: function* (c) {
      const g = c.g;
      const opts = [
        ...(g.units().some((u) => u.controller === c.p) ? [{ id: 'hand', label: 'Devolver uma unidade aliada para a mão' }] : []),
        ...(g.units().some((u) => u.controller !== c.p && !g.untargetableBy(u, c.p)) ? [{ id: 'weak', label: 'Dar -2 Might a uma unidade inimiga neste turno' }] : []),
      ];
      if (!opts.length) return false;
      const [m] = opts.length === 1 ? [opts[0].id] : yield* g.ask(c.p, 'choose', 'Mesmerize: escolha um modo', opts);
      c.data.mode = m;
      return true;
    },
    targets: (c) => [c.data.mode === 'weak' ? T.enemyUnit('Mesmerize: -2 Might em qual unidade inimiga?') : T.friendlyUnit('Mesmerize: devolver qual unidade sua?')],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (!u) return;
      if (c.data.mode === 'weak') c.g.giveMight(u, -2);
      else c.g.returnToHand(u);
    },
  },
});
