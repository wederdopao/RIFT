import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Quando uma unidade que você controla se torna Mighty, você pode pagar [Order] para prepará-la.
// - "Se torna Mighty": passa de menos de 5 para 5+ de Might já no tabuleiro (evento 'mighty' do motor). Entrar com 5+
//   não conta (RiftJudge #9442); perder e recuperar dispara de novo (#4729); buff conta (#8285). Vale para a própria
//   Fiora.
// - "Você pode pagar [Order] para": custo do gatilho, decidido e pago ao pôr na pilha (383.3.a e 383.3.b).
registerCard({
  code: 'SFD-180',
  triggers: [
    {
      on: 'mighty',
      label: 'Pagar [Order] para preparar a unidade que se tornou Mighty',
      optional: 'Pagar [Order] para preparar a unidade que se tornou Mighty?',
      cond: (c, ev) => !!ev.unit && ev.unit.controller === c.p,
      cost: E(0, 'Order'),
      resolve: function* (c) {
        const u = c.ev!.unit;
        if (u.zone === 'board') c.g.ready(u, c.p);
      },
    },
  ],
});
