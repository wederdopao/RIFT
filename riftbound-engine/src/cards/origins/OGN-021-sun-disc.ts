import { registerCard } from '../../engine/script';

// Gear. [Tap]: Legion – a próxima unidade que você jogar neste turno entra pronta.
// Mudou (UNL, lote motor): Legion é palavra-chave dependente (727, 812): enquanto você não jogou outra carta neste
// turno a habilidade fica inativa e não pode ser ativada (patch notes do Unleashed, "Dependent Keywords, Updated Legion";
// RiftJudge #9805). Depois de ativada, segue normalmente (727.1.c.3.a).
// Conferido (microdetalhes UNL): com o Zilean, Time Mage, só a ficha original entra pronta. A cópia a mais herda só as
// modificações do efeito que gerou a jogada ou de habilidade ligada a ela (375; RiftJudge #9917, #11565), não as do Sun
// Disc, que vale para uma unidade só (RiftJudge #6312, #5664).
registerCard({
  code: 'OGN-021',
  activated: [
    {
      label: 'Exaurir (Legion): a próxima unidade entra pronta',
      exhaustSelf: true,
      condition: (g, self) => g.legion(self, self.controller),
      resolve: function* (c) {
        c.g.addEffect({ player: c.p, nextPlay: 'unit', enterReady: true, until: 'turn' });
        c.g.say(`A próxima unidade que ${c.g.pname(c.p)} jogar neste turno entra pronta.`, c.p);
      },
    },
  ],
});
