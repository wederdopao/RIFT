import { registerCard } from '../../engine/script';

// Quando eu me movo para um campo de batalha, descarte 1. Quando eu venço um combate, compre 1.
// Vencer: o meu controlador é o único com unidades no campo na determinação do resultado (regra 466.3; 466.3.c: as
// unidades herdam o resultado) — evento 'combatWin'.
registerCard({
  code: 'SFD-123',
  triggers: [
    {
      on: 'move',
      label: 'Descartar 1',
      cond: (c, ev) => ev.unit?.id === c.self.id && ev.to?.t === 'bf',
      resolve: function* (c) {
        yield* c.g.discard(c.p, 1);
      },
    },
    {
      on: 'combatWin',
      label: 'Comprar 1 (venci o combate)',
      cond: (c, ev) => ev.player === c.p && (ev.units || []).includes(c.self.id),
      resolve: function* (c) {
        yield* c.g.draw(c.p, 1);
      },
    },
  ],
});
