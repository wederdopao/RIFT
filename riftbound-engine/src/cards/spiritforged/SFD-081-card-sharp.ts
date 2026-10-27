import { registerCard } from '../../engine/script';
import { opp } from '../../engine/engine';
import type { P } from '../../engine/types';

// Quando você me joga, você e cada oponente podem jogar uma ficha de gear Gold exaurida. Para cada oponente que jogou,
// você joga uma ficha de gear Gold exaurida.
// - As decisões são da resolução (o "pode" não é a primeira parte de um "você pode", 383.3.a.3), uma por jogador, na
//   ordem de turno a partir do jogador do turno (303.2.a).
// - Com o oponente aceitando, você fica com dois Golds (FAQ riftjudge #8614).
registerCard({
  code: 'SFD-081',
  onPlay: [
    {
      label: 'Você e o oponente podem jogar Gold',
      resolve: function* (c) {
        const g = c.g;
        const yes: Record<number, boolean> = {};
        for (const p of [g.active, opp(g.active)] as P[])
          yes[p] = yield* g.yesNo(p, `Card Sharp: jogar uma ficha de Gold exaurida?${p !== c.p ? ` (se jogar, ${g.pname(c.p)} joga outra)` : ''}`);
        for (const p of [g.active, opp(g.active)] as P[]) if (yes[p]) g.createToken('TOK-GOLD', p, { t: 'base', p }, false);
        if (yes[opp(c.p)]) g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
  ],
});
