import { registerCard } from '../../engine/script';
import { bfIdx } from '../helpers';
// Campo: quando você segura (hold) aqui, dê ao seu próximo spell neste turno [Repeat] igual ao custo base dele.
// "Custo base" = o impresso (356.1.c, 206), mesmo que o spell seja jogado com desconto ou escondido; spell que já tem
// Repeat fica com mais uma instância, paga à parte (820.3). Acaba no próximo spell jogado neste turno, pague-se ou não
// (o mesmo efeito do Temporal Portal).
registerCard({
  code: 'UNL-216',
  triggers: [
    {
      on: 'hold',
      label: 'Próximo spell ganha Repeat',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      resolve: function* (c) {
        c.g.addEffect({ player: c.p, until: 'turn', nextPlay: 'spell', grantRepeat: 'printed' });
        c.g.say(`O próximo spell de ${c.g.pname(c.p)} neste turno tem Repeat igual ao custo base dele.`, c.p);
      },
    },
  ],
});
