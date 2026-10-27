import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Weaponmaster. Quando você prende um equipamento em mim, você pode pagar [1] para comprar 1.
// "Pagar [1]" está no início do efeito: é pago ao pôr o gatilho na pilha (regra 740.4.a.2).
registerCard({
  code: 'SFD-119',
  keywords: { weaponmaster: true },
  triggers: [
    {
      on: 'attach',
      label: 'Equipamento preso em mim: pagar 1 para comprar 1',
      optional: 'Pagar [1] para comprar 1?',
      cost: E(1),
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.player === c.p && !!ev.obj && c.g.data(ev.obj).tags.includes('Equipment'),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
