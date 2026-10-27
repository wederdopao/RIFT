import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Swain, Visionary
registerCard({
  code: 'VEN-065',
  keywords: { vision: 1 },
  triggers: [
    {
      on: 'conquer',
      label: 'Ganhar 1 ponto (unidade, gear e spell jogados neste turno)',
      cond: (c, ev) => {
        const g = c.g;
        if (ev.player !== c.p || !(ev.units || []).includes(c.self.id)) return false;
        const played = g.pl[c.p].played.map((id) => g.objs[id]).filter((o) => o && !o.token);
        return ['unit', 'gear', 'spell'].every((k) => played.some((o) => g.kind(o) === k));
      },
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, 'Swain, Visionary');
      },
    },
  ],
});
