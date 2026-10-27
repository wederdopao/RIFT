import { registerCard } from '../../engine/script';

// Reaction: dê +2 de Might a duas unidades aliadas neste turno.
// Exatamente duas unidades diferentes como alvo (sem "até"); se uma ficar ilegal, a outra ainda recebe
// (riftjudge FAQ #1462 e #1242; regra 359.3.e.8).
registerCard({
  code: 'OGN-206',
  keywords: { reaction: true },
  spell: {
    label: 'Back to Back',
    targets: [{ prompt: 'Back to Back: +2 em quais duas unidades suas?', filter: (c, o) => o.controller === c.p, min: 2, max: 2 }],
    resolve: function* (c) {
      for (const u of c.targets[0]) c.g.giveMight(u, 2);
    },
  },
});
