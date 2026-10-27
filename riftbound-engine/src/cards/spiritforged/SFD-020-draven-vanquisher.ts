import { registerCard } from '../../engine/script';
import { E } from '../helpers';

// Quando eu venço um combate, jogue uma ficha de gear Gold exaurida.
// Quando eu ataco ou defendo, você pode pagar [Fury] para me dar +2 de Might neste turno (errata do Vendetta).
// - Vencer: o meu controlador é o único com unidades no campo no resultado do combate e eu estou lá (466.3.a, 466.3.c).
// - "Você pode pagar" no início do efeito: decidido e pago ao pôr o gatilho na pilha (383.3.a, 383.3.b).
registerCard({
  code: 'SFD-020',
  triggers: [
    {
      on: 'combatWin',
      label: 'Venceu o combate: ficha Gold exaurida',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        c.g.createToken('TOK-GOLD', c.p, { t: 'base', p: c.p }, false);
      },
    },
    {
      on: ['attack', 'defend'],
      label: 'Pagar [Fury]: +2 de Might neste turno',
      optional: 'pagar [Fury] para ganhar +2 de Might neste turno?',
      cond: (c, ev) => ev.unit?.id === c.self.id,
      cost: E(0, 'Fury'),
      resolve: function* (c) {
        if (c.self.zone === 'board') c.g.giveMight(c.self, 2);
      },
    },
  ],
});
