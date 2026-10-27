import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
import type { P } from '../../engine/types';
// Campo: quando um jogador escolhe uma unidade aliada aqui com um spell pela primeira vez no turno, ele compra 1.
// "Primeira vez" é por jogador: cada um pode comprar uma vez por turno (rulings FAQ #6567 e #7963 em
// app.riftjudge.com); não precisa controlar o campo (FAQ #1273). Escolher = pôr como alvo (regra 383.4.b): o gatilho
// vai para a pilha depois que o spell é finalizado, então resolve antes dele (FAQ #434).
registerCard({
  code: 'OGN-292',
  triggers: [
    {
      on: 'chosen',
      label: 'Comprar 1 (primeira escolha de unidade aliada aqui com spell no turno)',
      // o texto diz qual jogador age ("they draw"): ele controla o gatilho, quem quer que controle o campo (regra 190.6.c)
      controller: (_g, _src, ev) => (ev.by as P) ?? null,
      cond: (c, ev) => {
        const g = c.g;
        const o = ev.obj;
        const by = ev.by as P;
        if (!o || !ev.source || o.zone !== 'board' || !g.isUnit(o)) return false;
        if (g.kind(ev.source) !== 'spell' || o.controller !== by || g.bfIndex(o) !== bfIdx(c)) return false;
        // "pela primeira vez no turno", por jogador: marca já ao disparar (um spell pode escolher 2 unidades aqui)
        const d = (c.self.data ||= {});
        const seen: Record<string, number> = (d.dreamTurn ||= {});
        if (seen[by] === g.turn) return false;
        seen[by] = g.turn;
        return true;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.ev!.by as P, 1);
      },
    },
  ],
});
