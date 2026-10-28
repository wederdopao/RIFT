import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Decree of Focus
registerCard({
  code: 'VEN-040',
  keywords: { reaction: true },
  spell: {
    label: 'Decree of Focus',
    targets: [
      {
        prompt: 'Decree of Focus: qual unidade sua (em combate com unidade Fury inimiga ou escolhida por spell Fury inimigo)?',
        filter: (c, o) => {
          const g = c.g;
          if (o.controller !== c.p) return false;
          const i = g.bfIndex(o);
          const inCombatFury = i >= 0 && g.inCombat(o) && g.unitsAtBf(i).some((e) => e.controller !== c.p && hasDomain(g, e, 'Fury'));
          // "being chosen": alvos da jogada e das execuções do Repeat (itemChose)
          const chosen =g.chain.some((it) => it.kind === 'spell' && it.controller !== c.p && !!it.cardId && hasDomain(g, g.objs[it.cardId], 'Fury') && g.itemChose(it, o));
          return inCombatFury || chosen;
        },
      },
    ],
    resolve: function* (c) {
      const u = c.targets[0][0];
      if (u) c.g.giveMight(u, 4);
    },
  },
});
