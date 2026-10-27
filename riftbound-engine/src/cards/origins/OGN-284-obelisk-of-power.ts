import { registerCard } from '../../engine/script';
import type { P } from '../../engine/types';
// Campo: no início da primeira Beginning Phase de cada jogador, esse jogador canaliza 1 runa.
// "Primeira" é por jogador: é a Beginning Phase do primeiro turno dele (o motor marca firstChannelDone só na fase de
// canalizar desse turno, depois da Beginning Phase), mesmo com turnos extras no meio.
// Sem controlador, o gatilho é do jogador do turno (regra 190.6.b); com controlador, é dele (190.6.a).
registerCard({
  code: 'OGN-284',
  triggers: [
    {
      on: 'beginStart',
      label: 'Canalizar 1 runa (primeira Beginning Phase)',
      cond: (c, ev) => ev.player !== undefined && !c.g.firstChannelDone[ev.player as P],
      resolve: function* (c) {
        c.g.channel(c.ev!.player as P, 1);
      },
    },
  ],
});
