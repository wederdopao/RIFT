import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';
// Campo: no início da primeira Beginning Phase de cada jogador, esse jogador ganha 1 ponto.
// "Primeira" é por jogador: é a Beginning Phase do primeiro turno dele (o motor marca firstChannelDone só na fase de
// canalizar desse turno, depois da Beginning Phase), mesmo com turnos extras no meio.
// Sem controlador, o gatilho é do jogador do turno (regra 190.6.b, que usa esta carta como exemplo).
registerCard({
  code: 'OGN-290',
  triggers: [
    {
      on: 'beginStart',
      label: 'Ganhar 1 ponto (primeira Beginning Phase)',
      cond: (c, ev) => ev.player !== undefined && !c.g.firstChannelDone[ev.player as P],
      resolve: function* (c) {
        c.g.gainPoints(c.ev!.player as P, 1, "The Arena's Greatest");
      },
    },
  ],
});
