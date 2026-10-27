import { registerCard } from '../../engine/script';
import { E, bfIdx } from '../helpers';
// Campo: quando você conquista aqui, você pode pagar [1] para preparar a sua lenda.
// O [1] é pago ao pôr o gatilho na pilha, não na resolução (RiftJudge #11075, #13028; regra 383.3.b).
registerCard({
  code: 'SFD-210',
  triggers: [
    {
      on: 'conquer',
      label: 'Pagar [1] para preparar a sua lenda',
      optional: 'Pagar [1] para preparar a sua lenda?',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      cost: E(1),
      resolve: function* (c) {
        // com Neeko pode haver mais de uma lenda: o jogador escolhe qual
        const ls = c.g.legendsOf(c.p);
        const leg = ls.length > 1 ? (yield* c.g.chooseObj(c.p, 'Preparar qual lenda?', ls))[0] : ls[0];
        if (!leg) return;
        c.g.ready(leg, c.p);
        c.g.say(`${c.g.name(leg)} fica pronta.`, c.p);
      },
    },
  ],
});
