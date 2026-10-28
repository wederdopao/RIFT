import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Blade Twirler
registerCard({
  code: 'VEN-002',
  triggers: [
    {
      on: 'move',
      label: 'Burn 1 (escolha um jogador)',
      cond: (c, ev) => ev.unit?.id === c.self.id && c.g.movesThisTurn(c.self) === 1,
      // o jogador é alvo (355.9.a: "a player"), escolhido ao pôr o gatilho na pilha (355.5), como Bewitching Spirit
      prepare: function* (c) {
        const g = c.g;
        const [id] = yield* g.ask(c.p, 'choose', 'Blade Twirler: qual jogador faz Burn 1?', ([0, 1] as P[]).map((p) => ({ id: String(p), label: g.pname(p) + (p === c.p ? ' (você)' : '') })));
        c.data.who = Number(id) as P;
        return true;
      },
      resolve: function* (c) {
        c.g.burn(c.data.who as P, 1);
      },
    },
  ],
});
