import { registerCard } from '../../engine/script';
import { opp } from '../../engine/engine';

// Deflect. Na primeira vez em que eu venço um combate em cada turno, você ganha 1 ponto. Quando eu morro em combate,
// escolha um oponente: ele ganha 1 ponto.
// - Vencer: evento 'combatWin' (regra 466.3), resolvido antes do fim do combate (FAQ riftjudge #8630).
// - "A primeira vez em cada turno" (383.3.e): conta só as vezes em que venci.
// - Morrer em combate: ainda com a designação de atacante/defensor, inclusive por spell durante o showdown do combate
//   (FAQ #8741, #9518); depois que o combate acaba não conta (#8630). Os pontos vêm de efeito, sem a restrição do
//   último ponto (FAQ #10614). No 1x1 o oponente escolhido é o único.
registerCard({
  code: 'SFD-148',
  keywords: { deflect: 1 },
  triggers: [
    {
      on: 'combatWin',
      label: 'Ganhar 1 ponto (primeira vitória em combate no turno)',
      cond: (c, ev) => {
        if (ev.player !== c.p || !(ev.units || []).includes(c.self.id)) return false;
        const d = (c.self.data ||= {});
        if (d.dravenWinTurn === c.g.turn) return false;
        d.dravenWinTurn = c.g.turn;
        return true;
      },
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, 'Draven, Audacious');
      },
    },
    {
      on: 'die',
      zone: 'self',
      label: 'Morri em combate: o oponente ganha 1 ponto',
      cond: (c, ev) => ev.obj?.id === c.self.id && !!ev.snap?.role,
      resolve: function* (c) {
        const o = opp(c.p);
        c.g.gainPoints(o, 1, 'Draven, Audacious');
      },
    },
  ],
});
