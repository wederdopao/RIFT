import { registerCard } from '../../engine/script';

// Quando você joga a sua segunda carta num turno, me dê +2 de Might neste turno e me prepare.
// Darius também dispara quando ele mesmo é a segunda carta (já está no tabuleiro quando a condição é checada:
// regra 383.2.c.1; RiftJudge FAQ #8678).
registerCard({
  code: 'OGN-027',
  triggers: [
    {
      on: 'cardPlayed',
      label: 'Segunda carta do turno: +2 de Might e preparar',
      // a 2ª jogada que termina no turno (gatilho de "jogar" = jogada completa, 419.4.a; spell anulado não conta)
      cond: (c, ev) => ev.player === c.p && ev.nth === 2,
      resolve: function* (c) {
        if (c.self.zone !== 'board') return;
        c.g.giveMight(c.self, 2);
        c.g.ready(c.self);
      },
    },
  ],
});
