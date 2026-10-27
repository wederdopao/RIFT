import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Unidade 2. Quando você me joga, escolha um jogador. Ele descarta 1.
// - O jogador é alvo (355.9.a: "a player"), escolhido ao pôr o gatilho na pilha (355.5.b, 383.3); quem descarta escolhe
//   a carta na resolução (355.17). Pode ser você mesmo.
registerCard({
  code: 'UNL-121',
  onPlay: [
    {
      label: 'Um jogador escolhido descarta 1',
      prepare: function* (c) {
        const g = c.g;
        const opts = ([0, 1] as P[]).map((p) => ({ id: String(p), label: g.pname(p) + (p === c.p ? ' (você)' : '') }));
        const [k] = yield* g.ask(c.p, 'choose', 'Bewitching Spirit: qual jogador descarta 1?', opts);
        c.data.who = Number(k) as P;
        return true;
      },
      resolve: function* (c) {
        const who = c.data.who as P;
        yield* c.g.discard(who, 1, 'Bewitching Spirit: escolha a carta para descartar');
      },
    },
  ],
});
