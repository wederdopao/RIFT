import { registerCard } from '../../engine/script';
import { E, bfIdx } from '../helpers';
// Campo: quando você segura aqui, você pode pagar [A][A][A][A] (4 power de qualquer domínio — campo sem domínio) para
// marcar 1 ponto. O custo é pago ao pôr o gatilho na pilha (regra 383.3.b).
registerCard({
  code: 'SFD-214',
  triggers: [
    {
      on: 'hold',
      label: 'Pagar 4 power para marcar 1 ponto',
      optional: 'Pagar 4 power para marcar 1 ponto?',
      cond: (c, ev) => ev.bf === bfIdx(c) && ev.player === c.p,
      cost: E(0, 'any', 'any', 'any', 'any'),
      resolve: function* (c) {
        c.g.gainPoints(c.p, 1, 'Power Nexus');
      },
    },
  ],
});
