import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Morgana, Vindictive
registerCard({
  code: 'VEN-017',
  keywords: { ambush: true },
  onPlay: [
    {
      label: 'Dano igual ao dano marcado',
      targets: [T.anyUnit('Morgana: causar dano igual ao dano marcado em qual unidade?')],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u && u.damage > 0) c.g.dealDamage(u, u.damage, c.self);
      },
    },
  ],
});
