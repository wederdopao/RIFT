import { registerCard } from '../../engine/script';

// Lenda: no início da sua Beginning Phase, compre 1 se tiver 1 ou menos cartas na mão.
// Regra 383.2.a.1 (o exemplo é esta carta): o "se" vem depois do efeito, então faz parte do efeito e é checado só
// na resolução; o gatilho sempre vai para a pilha.
registerCard({
  code: 'OGN-251',
  triggers: [
    {
      on: 'beginStart',
      label: 'Comprar 1 com mão de 1 ou menos',
      cond: (c, ev) => ev.player === c.p,
      resolve: function* (c) {
        if (c.g.pl[c.p].hand.length <= 1) yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
