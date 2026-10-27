import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';

// Action: bana uma unidade aliada; depois o dono dela a joga na base dele, ignorando o custo.
registerCard({
  code: 'OGN-102',
  keywords: { action: true },
  spell: {
    label: 'Portal Rescue',
    targets: [{ prompt: 'Portal Rescue: banir qual unidade sua?', filter: (c, o) => o.controller === c.p }],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      if (!u) return;
      const owner = u.owner;
      g.banishObj(u);
      if (u.zone !== 'banish') return; // fichas deixam de existir
      yield* g.playFromEffect(owner, u, NO_COST, { t: 'base', p: owner });
    },
  },
});
