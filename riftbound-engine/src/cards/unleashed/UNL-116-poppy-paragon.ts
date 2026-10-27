import { registerCard } from '../../engine/script';

// [Deflect]. Quando você me joga, se a pontuação de um oponente está a 3 pontos ou menos do Victory Score, prepare-me e
// ganhe 3 XP.
// - O "se" vem logo depois da condição: faz parte dela (383.2.a.1) e é checado quando eu entro; se não vale, o gatilho
//   não vai para a pilha (riftboundfaq.com, Abilities #trigger-time-conditions).
// - "Prepare-me" e "ganhe 3 XP" são instruções independentes: se eu saí do tabuleiro, só o XP acontece (359.3.e.12).
registerCard({
  code: 'UNL-116',
  keywords: { deflect: 1 },
  triggers: [
    {
      on: 'play',
      label: 'Preparar-me e ganhar 3 XP',
      cond: (c, ev) => ev.obj?.id === c.self.id && c.g.pl[1 - c.p].points >= c.g.cfg.victoryScore - 3,
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.ready(c.self, c.p);
        c.g.gainXp(c.p, 3, c.self);
      },
    },
  ],
});
