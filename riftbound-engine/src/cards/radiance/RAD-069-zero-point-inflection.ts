import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';

// Quando você joga uma carta, compre 2. Quando você compra 1+ cartas com 9+ outras na mão: descarte a mão, mate isto,
// um oponente marca 1 ponto.
// - "When you play a card" sem "another": vale também para a própria Zero Point Inflection.
// - "draw 1 or more cards": um gatilho por ação de comprar (ev.batch), quando a mão chega a 10+ (a carta comprada e 9
//   ou mais outras).
// - A habilidade resolve mesmo que isto já tenha saído do tabuleiro (a habilidade é independente da fonte, 355.9.c):
//   a mão é descartada e o oponente marca o ponto; "kill this" só vale se ainda está no tabuleiro (359.3.e.6).
registerCard({
  code: 'RAD-069',
  triggers: [
    {
      on: 'cardPlayed',
      label: 'Comprar 2',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 2);
      },
    },
    {
      on: 'draw',
      label: 'Descartar a mão, matar isto; o oponente marca 1 ponto',
      cond: (c, ev) => {
        if (ev.player !== c.p || c.g.pl[c.p].hand.length < 10) return false;
        const b = ev.batch as Record<string, boolean> | undefined;
        const k = `zpi:${c.self.id}`;
        if (b) {
          if (b[k]) return false;
          b[k] = true;
        }
        return true;
      },
      resolve: function* (c) {
        const g = c.g;
        g.discardObjs(c.p, g.pl[c.p].hand.map((id) => g.objs[id]));
        if (c.self.zone === 'board') yield* g.killG(c.self);
        g.gainPoints((1 - c.p) as P, 1, 'Zero Point Inflection');
      },
    },
  ],
});
