import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você conquista aqui, ponha as 2 cartas do topo do seu deck no seu descarte.
// É mover cartas do topo do deck para o descarte (regra 440.1): com o deck vazio, há Burn Out e o resto continua
// (regra 431.1.b).
registerCard({
  code: 'SFD-212',
  triggers: [
    {
      on: 'conquer',
      label: 'Pôr as 2 do topo do deck no descarte',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        c.g.burn(c.p, 2);
        c.g.say(`${c.g.pname(c.p)} põe as 2 cartas do topo do deck no descarte.`, c.p);
      },
    },
  ],
});
