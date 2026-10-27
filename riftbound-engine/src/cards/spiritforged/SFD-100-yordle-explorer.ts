import { registerCard } from '../../engine/script';

// Quando você joga uma carta com custo de Power [Rune][Rune] ou mais, compre 1.
// O custo checado é o impresso (regra 206.1: efeitos que olham o custo usam o custo base). Spells contam quando a
// jogada termina, na resolução (regra 419.4.a); fichas não são cartas jogadas.
registerCard({
  code: 'SFD-100',
  triggers: [
    {
      on: 'cardPlayed',
      label: 'Carta com 2+ de Power: comprar 1',
      cond: (c, ev) => ev.player === c.p && !!ev.obj && c.g.data(ev.obj).power >= 2,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
