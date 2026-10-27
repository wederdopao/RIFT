import { registerCard } from '../../engine/script';
// Lenda: quando você joga um spell que custa 5 ou mais de energia, compre 1.
// "Jogar" em gatilho = a jogada terminou com a resolução (419.4.a): a compra vem depois do spell; anulado não conta.
// O custo verificado é o impresso (regra 206).
registerCard({
  code: 'OGS-021',
  triggers: [
    {
      on: 'play',
      label: 'Comprar 1 (spell de 5+)',
      cond: (c, ev) => ev.player === c.p && !!ev.spell && !!ev.obj && c.g.data(ev.obj).energy >= 5,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
