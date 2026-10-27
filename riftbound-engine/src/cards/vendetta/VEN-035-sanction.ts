import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Sanction
registerCard({
  code: 'VEN-035',
  keywords: { reaction: true },
  spell: {
    label: 'Sanction',
    prepare: function* (c) {
      const g = c.g;
      const opts = [
        ...(g.units().length ? [{ id: 'emp', label: 'Empower uma unidade (disempower no fim do turno)' }] : []),
        ...(g.units().some((u) => u.empowered) ? [{ id: 'dis', label: 'Disempower uma unidade Empowered (empower no fim do turno)' }] : []),
      ];
      if (!opts.length) return false;
      const [m] = opts.length === 1 ? [opts[0].id] : yield* g.ask(c.p, 'choose', 'Sanction: escolha um modo', opts);
      c.data.mode = m;
      return true;
    },
    targets: (c) => [
      c.data.mode === 'dis'
        ? { prompt: 'Sanction: qual unidade Empowered?', filter: (_c, o) => o.empowered }
        : { prompt: 'Sanction: empower qual unidade?' },
    ],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u) return;
      const toEmpowered = c.data.mode === 'dis';
      if (toEmpowered) g.disempower(u);
      else g.empowerObj(u, c.p);
      const id = u.id;
      g.addDelayed({
        controller: c.p,
        sourceId: c.self.id,
        on: 'turnEnd',
        once: true,
        untilTurn: g.turn,
        ability: {
          label: 'Sanction: reverter no fim do turno',
          resolve: function* (cc) {
            const o = cc.g.objs[id];
            if (!o || o.zone !== 'board') return;
            if (toEmpowered) cc.g.empowerObj(o, cc.p);
            else cc.g.disempower(o);
          },
        },
      });
    },
  },
});
