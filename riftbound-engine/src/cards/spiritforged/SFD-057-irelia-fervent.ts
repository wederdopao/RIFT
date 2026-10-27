import { registerCard } from '../../engine/script';

// [Deflect]. Quando você me escolhe ou me prepara, dê-me +1 de Might neste turno.
// "Escolher" = pôr como alvo (regra 383.4.b). Preparar no despertar conta, se eu estava exaurida (RiftJudge FAQ #236,
// #8717); escolher e preparar com o mesmo spell dá +2 (FAQ #8611). Se o oponente me prepara, não dispara.
registerCard({
  code: 'SFD-057',
  keywords: { deflect: 1 },
  triggers: [
    {
      on: 'chosen',
      label: '+1 de Might neste turno (escolhida)',
      cond: (c, ev) => ev.obj?.id === c.self.id && ev.by === c.p,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 1);
      },
    },
    {
      on: 'ready',
      label: '+1 de Might neste turno (preparada)',
      cond: (c, ev) => ev.obj?.id === c.self.id && ev.player === c.p,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 1);
      },
    },
  ],
});
