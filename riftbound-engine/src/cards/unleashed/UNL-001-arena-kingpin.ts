import { registerCard } from '../../engine/script';

// Arena Kingpin. Entro pronta. [Tap]: dê +3 de Might a uma unidade neste turno.
// - "Entro pronta" é uma substituição de como a unidade entra (369.3).
// - A habilidade ativada não tem [Action]/[Reaction]: só na fase principal do seu turno, estado neutro aberto. O alvo é
//   qualquer unidade (sua ou inimiga, em qualquer local).
registerCard({
  code: 'UNL-001',
  entersReady: () => true,
  activated: [
    {
      label: 'Dar +3 de Might a uma unidade neste turno',
      exhaustSelf: true,
      targets: [{ prompt: 'Arena Kingpin: dar +3 de Might a qual unidade?' }],
      resolve: function* (c) {
        const u = c.targets[0][0];
        if (u) c.g.giveMight(u, 3);
      },
    },
  ],
});
