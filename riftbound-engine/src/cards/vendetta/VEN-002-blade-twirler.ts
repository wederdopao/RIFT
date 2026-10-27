import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';
import { E, T, chooseTokenLoc } from '../helpers';
import { opp, runes, hasDomain, empowerAbility } from './_ha';

// Blade Twirler
registerCard({
  code: 'VEN-002',
  triggers: [
    {
      on: 'move',
      label: 'Burn 1 (escolha um jogador)',
      cond: (c, ev) => ev.unit?.id === c.self.id && c.g.movesThisTurn(c.self) === 1,
      resolve: function* (c) {
        const g = c.g;
        const [id] = yield* g.ask(c.p, 'choose', 'Blade Twirler: qual jogador faz Burn 1?', [
          { id: '0', label: g.pname(0) },
          { id: '1', label: g.pname(1) },
        ]);
        g.burn(Number(id) as 0 | 1, 1);
      },
    },
  ],
});
