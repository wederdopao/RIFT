import { registerCard } from '../../engine/script';
// Lenda: quando você conquista, se tiver 4 ou mais unidades naquele campo, compre 2.
// O "se" vem logo depois da condição: faz parte da condição do gatilho e não é checado de novo na resolução
// (regra 383.2.a.1).
registerCard({
  code: 'OGS-023',
  triggers: [
    {
      on: 'conquer',
      label: 'Comprar 2 (4+ unidades no campo)',
      cond: (c, ev) => ev.player === c.p && c.g.unitsAtBf(ev.bf, c.p).length >= 4,
      resolve: function* (c) {
        yield* c.g.draw(c.p, 2);
      },
    },
  ],
});
