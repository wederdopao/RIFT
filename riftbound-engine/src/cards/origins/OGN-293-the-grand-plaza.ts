import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você segura aqui, se você tem 7 ou mais unidades aqui, você vence a partida.
// O "se" vem logo depois da condição: faz parte da condição do gatilho e não é checado de novo na resolução
// (regra 383.2.a.1).
registerCard({
  code: 'OGN-293',
  triggers: [
    {
      on: 'hold',
      label: 'Vencer com 7+ unidades aqui',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p && c.g.unitsAtBf(bfIdx(c), c.p).length >= 7,
      resolve: function* (c) {
        const g = c.g;
        if (g.winner !== null) return;
        g.winner = c.p;
        g.winReason = 'The Grand Plaza';
        g.say(`🏆 ${g.pname(c.p)} segura The Grand Plaza com 7+ unidades e vence a partida!`, c.p);
      },
    },
  ],
});
