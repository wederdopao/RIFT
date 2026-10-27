import { registerCard } from '../../engine/script';

// Reaction: escolha uma unidade aliada. Neste turno, aumente o Might dela até o Might de outra unidade aliada.
// As duas unidades são alvos escolhidos ao jogar (FAQ riftjudge #6914 e #8123: sem duas unidades aliadas não dá para
// jogar). O aumento é calculado uma vez na resolução, com o Might atual da outra unidade, e dura até o fim do turno
// (FAQ riftjudge #5181).
registerCard({
  code: 'OGN-108',
  keywords: { reaction: true },
  spell: {
    label: 'Convergent Mutation',
    targets: [
      { prompt: 'Convergent Mutation: aumentar o Might de qual unidade sua?', filter: (c, o) => o.controller === c.p },
      {
        prompt: 'Convergent Mutation: até o Might de qual outra unidade sua?',
        filter: (c, o) => o.controller === c.p && !c.targets[0]?.some((u) => u.id === o.id),
      },
    ],
    resolve: function* (c) {
      const g = c.g;
      const u = c.targets[0][0];
      const ref = c.targets[1]?.[0];
      // alvo que deixou de ser válido: a informação dele é ignorada (regra 359.3.e.12)
      if (!u || !ref) return;
      const diff = g.might(ref) - g.might(u);
      if (diff > 0) g.giveMight(u, diff);
      else g.say(`Convergent Mutation: ${g.name(u)} já tem Might igual ou maior.`);
    },
  },
});
