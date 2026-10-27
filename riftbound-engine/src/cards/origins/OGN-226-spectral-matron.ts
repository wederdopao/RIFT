import { registerCard } from '../../engine/script';
import { NO_COST } from '../../engine/types';

// Quando você me joga, você pode jogar do seu descarte uma unidade que custe até [3] e até [Rune], ignorando o custo.
// A unidade do descarte (zona pública) é alvo, escolhido ao pôr o gatilho na pilha; o "você pode" no começo do efeito
// também é decidido aí (regras 355.10.a e 383.3.a; riftjudge FAQ #5659 e #11803). "Custo" é o impresso (regra 206).
// Ignorar o custo zera só o custo base: custos adicionais (Cruel Patron) e opcionais (Accelerate) continuam
// (regra 356.1.b.3; FAQ #3434). O local é escolhido ao jogar a unidade (base ou campo que você controla).
registerCard({
  code: 'OGN-226',
  onPlay: [
    {
      label: 'Jogar uma unidade barata do descarte',
      optional: 'Jogar do seu descarte uma unidade que custe até 3 de energia e até 1 power, ignorando o custo?',
      targets: [
        {
          prompt: 'Spectral Matron: jogar qual unidade do seu descarte?',
          kind: 'trash',
          filter: (c, o) => o.owner === c.p && c.g.isUnit(o) && c.g.data(o).energy <= 3 && c.g.data(o).power <= 1,
        },
      ],
      resolve: function* (c) {
        const o = c.targets[0][0];
        if (o && o.zone === 'trash') yield* c.g.playFromEffect(c.p, o, NO_COST);
      },
    },
  ],
});
