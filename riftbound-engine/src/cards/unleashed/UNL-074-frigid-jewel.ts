import { registerCard } from '../../engine/script';

// Quando você compra a sua segunda carta em cada turno (em qualquer turno), dê +2 de Might a uma unidade aliada neste
// turno. Conta todas as compras do turno, inclusive as de antes de o Jewel entrar (ev.nth do evento 'draw', contado
// pelo motor). A unidade é alvo, escolhida ao pôr o gatilho na pilha.
registerCard({
  code: 'UNL-074',
  triggers: [
    {
      on: 'draw',
      label: '+2 de Might a uma unidade aliada',
      cond: (c, ev) => ev.player === c.p && ev.nth === 2,
      targets: [{ prompt: 'Frigid Jewel: dar +2 de Might a qual unidade aliada?', filter: (c, o) => o.controller === c.p }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 2);
      },
    },
  ],
});
