import { registerCard } from '../../engine/script';

// Na primeira vez em cada turno que outra unidade aliada morre, compre 1.
// "A primeira vez ... em cada turno" é um fato do turno (regra 383.1): conta toda unidade aliada que morreu neste
// turno, mesmo antes de o Wraith entrar em jogo (leitura literal; nenhuma regra ou ruling diz o contrário). Mortes
// simultâneas contam como uma só vez e o gatilho dispara uma vez só (regra 383.1.b). O Wraith não vê a própria morte
// (FAQ riftjudge #1702 e #3911).
registerCard({
  code: 'OGN-118',
  triggers: [
    {
      on: 'die',
      label: 'Comprar 1 (primeira unidade aliada morta no turno)',
      cond: (c, ev) => {
        if (ev.controller !== c.p || !ev.obj || ev.obj.id === c.self.id || !c.g.isUnit(ev.obj)) return false;
        if ((ev.priorDeaths ?? 0) > 0) return false; // outra unidade aliada já tinha morrido neste turno
        const d = (c.self.data ||= {});
        if (d.wraithTurn === c.g.turn) return false; // já disparou por uma das mortes simultâneas
        d.wraithTurn = c.g.turn;
        return true;
      },
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
