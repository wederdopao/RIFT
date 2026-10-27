import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Jayce, Brilliant Inventor
const ready = {
  label: 'Jayce: preparar algo exaurido',
  optional: 'Preparar algo (além de mim) que esteja exaurido?',
  targets: [{ prompt: 'Jayce: preparar o quê?', kind: 'object' as const, filter: (c: any, o: any) => o.exhausted && o.id !== c.self.id }],
  resolve: function* (c: any) {
    const o = c.targets[0][0];
    if (o) c.g.ready(o, c.p);
  },
};
registerCard({
  code: 'VEN-068',
  onPlay: [ready],
  triggers: [
    {
      on: 'cardPlayed',
      ...ready,
      cond: (c, ev) => {
        const g = c.g;
        if (ev.player !== c.p || !ev.obj || ev.obj.token || !g.isGear(ev.obj)) return false;
        return g.pl[c.p].played.filter((id) => g.objs[id] && g.isGear(g.objs[id])).length === 1;
      },
    },
  ],
});
