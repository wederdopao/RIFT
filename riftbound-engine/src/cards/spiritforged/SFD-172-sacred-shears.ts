import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Equip [Order]. Bônus de Might +1. Texto de efeito (acrescentado à unidade equipada, regra 136.2.c):
// "Deathknell: compre 1."
// - O Deathknell é da unidade: dispara quando ela morre com a tesoura anexada (RiftJudge #8441, #8952, #10559), não
//   quando só a tesoura morre, nem quando a unidade volta para a mão (#10667). Quem compra é quem controlava a unidade.
// - Conta como Deathknell para Karthus, Eternal (dispara de novo: FAQ #10912) — o motor marca os gatilhos de texto de
//   efeito com [Deathknell].
registerCard({
  code: 'SFD-172',
  equipCost: E(0, 'Order'),
  equipped: {
    triggers: [
      {
        on: 'die',
        zone: 'self',
        label: 'Deathknell: comprar 1',
        cond: (c, ev) => ev.obj?.id === c.self.id,
        resolve: function* (c) {
          yield* c.g.draw(c.p, 1);
        },
      },
    ],
  },
});
