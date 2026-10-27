import { registerCard } from '../../engine/script';
// RAD-166 Ruined Monastery — "When you conquer here, you may discard 1 and channel 1 rune exhausted."
// Descartar não é custo do canalizar (não há "to"/"if you do"): com a mão vazia o jogador ainda pode fazer o gatilho e
// canalizar; a instrução impossível é ignorada (359.3.e.11, exemplo "Discard 2, then draw 2").
registerCard({
  code: 'RAD-166',
  triggers: [
    {
      on: 'conquer',
      label: 'Descartar 1 e canalizar 1 runa exausta',
      optional: 'descartar 1 carta e canalizar 1 runa exausta?',
      cond: (c, ev) => ev.bf === c.g.bfOf(c.self) && ev.player === c.p,
      possible: (c) => c.g.pl[c.p].hand.length > 0 || c.g.pl[c.p].runeDeck.length > 0,
      resolve: function* (c) {
        yield* c.g.discard(c.p, 1);
        c.g.channel(c.p, 1, true);
      },
    },
  ],
});
