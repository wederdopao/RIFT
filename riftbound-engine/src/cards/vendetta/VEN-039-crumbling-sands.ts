import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Crumbling Sands
registerCard({
  code: 'VEN-039',
  keywords: { reaction: true },
  spell: {
    label: 'Crumbling Sands',
    targets: [{ prompt: 'Crumbling Sands: anular qual spell?', kind: 'spell' }],
    resolve: function* (c) {
      const g = c.g;
      const s = c.targets[0][0];
      if (!s) return;
      const other = g.pl[opp(c.p)].played.some((id) => id !== s.id && g.kind(g.objs[id]) === 'spell');
      if (!other) return g.say('Crumbling Sands: nenhum outro spell do oponente neste turno.', c.p);
      const item = g.chain.find((it) => it.cardId === s.id);
      if (item) g.counter(item);
    },
  },
});
